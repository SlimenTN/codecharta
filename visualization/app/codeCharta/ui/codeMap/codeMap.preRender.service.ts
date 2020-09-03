"use strict"

import { CCFile, CodeMapNode, FileMeta } from "../../codeCharta.model"
import { IRootScopeService } from "angular"
import { NodeDecorator } from "../../util/nodeDecorator"
import { AggregationGenerator } from "../../util/aggregationGenerator"
import { DeltaGenerator } from "../../util/deltaGenerator"
import { CodeMapRenderService } from "./codeMap.render.service"
import { StoreService, StoreSubscriber } from "../../state/store.service"
import { ScalingService, ScalingSubscriber } from "../../state/store/appSettings/scaling/scaling.service"
import _ from "lodash"
import { hierarchy } from "d3"
import { ScalingActions } from "../../state/store/appSettings/scaling/scaling.actions"
import { IsLoadingMapActions, setIsLoadingMap } from "../../state/store/appSettings/isLoadingMap/isLoadingMap.actions"
import { IsLoadingFileActions, setIsLoadingFile } from "../../state/store/appSettings/isLoadingFile/isLoadingFile.actions"
import { SearchPanelModeActions } from "../../state/store/appSettings/searchPanelMode/searchPanelMode.actions"
import { isActionOfType } from "../../util/reduxHelper"
import { SortingOrderAscendingActions } from "../../state/store/appSettings/sortingOrderAscending/sortingOrderAscending.actions"
import { SortingOptionActions } from "../../state/store/dynamicSettings/sortingOption/sortingOption.actions"
import { IsAttributeSideBarVisibleActions } from "../../state/store/appSettings/isAttributeSideBarVisible/isAttributeSideBarVisible.actions"
import { fileStatesAvailable, getVisibleFileStates, isDeltaState, isPartialState, isSingleState } from "../../model/files/files.helper"
import { FileSelectionState, FileState } from "../../model/files/files"
import { MetricDataService, MetricDataSubscriber } from "../../state/store/metricData/metricData.service"
import { NodeMetricDataService } from "../../state/store/metricData/nodeMetricData/nodeMetricData.service"
import { EdgeMetricDataService } from "../../state/store/metricData/edgeMetricData/edgeMetricData.service"
import { BlacklistActions, removeLastBlacklistItem } from "../../state/store/fileSettings/blacklist/blacklist.actions"
import { FilesSelectionSubscriber, FilesService } from "../../state/store/files/files.service"
import { DialogService } from "../dialog/dialog.service"

const clone = require("rfdc")()

export interface CodeMapPreRenderServiceSubscriber {
	onRenderMapChanged(map: CodeMapNode)
}

export class CodeMapPreRenderService implements StoreSubscriber, MetricDataSubscriber, ScalingSubscriber, FilesSelectionSubscriber {
	private static RENDER_MAP_CHANGED_EVENT = "render-map-changed"

	private unifiedMap: CodeMapNode
	private unifiedFileMeta: FileMeta
	private isMapDecorated = false

	private readonly debounceRendering: () => void
	private DEBOUNCE_TIME = 0

	constructor(
		private $rootScope: IRootScopeService,
		private storeService: StoreService,
		private nodeMetricDataService: NodeMetricDataService,
		private codeMapRenderService: CodeMapRenderService,
		private edgeMetricDataService: EdgeMetricDataService,
		private dialogService: DialogService
	) {
		MetricDataService.subscribe(this.$rootScope, this)
		StoreService.subscribe(this.$rootScope, this)
		ScalingService.subscribe(this.$rootScope, this)
		FilesService.subscribe(this.$rootScope, this)
		this.debounceRendering = _.debounce(() => {
			if (this.allNecessaryRenderDataAvailable()) {
				this.renderAndNotify()
			}
		}, this.DEBOUNCE_TIME)
	}

	public getRenderMap(): CodeMapNode {
		return this.unifiedMap
	}

	public getRenderFileMeta(): FileMeta {
		return this.unifiedFileMeta
	}

	public onStoreChanged(actionType: string) {
		// Listening for blacklist-events here, since we have to revert the
		// latest blacklist change before the blacklist-subscribers are called
		if (isActionOfType(actionType, BlacklistActions)) {
			this.decorateExistingMap()
			this.debounceRendering()
		}

		if (
			this.allNecessaryRenderDataAvailable() &&
			!isActionOfType(actionType, ScalingActions) &&
			!isActionOfType(actionType, IsLoadingMapActions) &&
			!isActionOfType(actionType, IsLoadingFileActions) &&
			!isActionOfType(actionType, SearchPanelModeActions) &&
			!isActionOfType(actionType, SortingOrderAscendingActions) &&
			!isActionOfType(actionType, SortingOptionActions) &&
			!isActionOfType(actionType, IsAttributeSideBarVisibleActions) &&
			!isActionOfType(actionType, BlacklistActions)
		) {
			this.debounceRendering()
		}
	}

	public onScalingChanged() {
		if (this.allNecessaryRenderDataAvailable()) {
			this.scaleMapAndNotify()
		}
	}

	public onMetricDataChanged() {
		if (fileStatesAvailable(this.storeService.getState().files)) {
			this.updateRenderMapAndFileMeta()
			this.decorateNewMap()
			this.debounceRendering()
		}
	}

	public onFilesSelectionChanged() {
		this.isMapDecorated = false
	}

	private updateRenderMapAndFileMeta() {
		const unifiedFile = this.getSelectedFilesAsUnifiedMap()
		this.unifiedMap = unifiedFile.map
		this.unifiedFileMeta = unifiedFile.fileMeta
	}

	private decorateNewMap() {
		if (!this.isMapDecorated) {
			NodeDecorator.decorateMap(this.unifiedMap, this.storeService.getState().metricData.nodeMetricData)
			this.isMapDecorated = true
			this.decorateExistingMap()
		}
	}

	private decorateExistingMap() {
		if (this.isMapDecorated) {
			this.setEdgeMetricsForLeaves(this.unifiedMap)
			NodeDecorator.decorateParentNodesWithAggregatedAttributes(this.unifiedMap, this.storeService.getState())
			try {
				NodeDecorator.decorateMapWithBlacklist(this.unifiedMap, this.storeService.getState().fileSettings.blacklist)
			} catch (e) {
				this.storeService.dispatch(removeLastBlacklistItem())
				this.dialogService.showErrorDialog(e.message, "Blacklist Error")
			}
		}
	}

	private setEdgeMetricsForLeaves(map: CodeMapNode) {
		hierarchy<CodeMapNode>(map)
			.leaves()
			.forEach(node => {
				const edgeMetrics = this.edgeMetricDataService.getMetricValuesForNode(node)
				for (const edgeMetric of edgeMetrics.keys()) {
					Object.assign(node.data.edgeAttributes, { [edgeMetric]: edgeMetrics.get(edgeMetric) })
				}
			})
	}

	private getSelectedFilesAsUnifiedMap(): CCFile {
		const files = this.storeService.getState().files
		const visibleFileStates = clone(getVisibleFileStates(files))

		if (isSingleState(files)) {
			return visibleFileStates[0].file
		} else if (isPartialState(files)) {
			return AggregationGenerator.getAggregationFile(visibleFileStates.map(x => x.file))
		} else if (isDeltaState(files)) {
			return this.getDeltaFile(visibleFileStates)
		}
	}

	private getDeltaFile(visibleFileStates: FileState[]): CCFile {
		if (visibleFileStates.length == 2) {
			const referenceFile = visibleFileStates.find(x => x.selectedAs == FileSelectionState.Reference).file
			const comparisonFile = visibleFileStates.find(x => x.selectedAs == FileSelectionState.Comparison).file
			return DeltaGenerator.getDeltaFile(referenceFile, comparisonFile)
		} else {
			const referenceFile = visibleFileStates[0].file
			const comparisonFile = visibleFileStates[0].file
			return DeltaGenerator.getDeltaFile(referenceFile, comparisonFile)
		}
	}

	private renderAndNotify() {
		this.codeMapRenderService.render(this.unifiedMap)
		this.removeLoadingGifs()
		this.notifyMapChanged()
	}

	private scaleMapAndNotify() {
		this.showLoadingMapGif()
		this.codeMapRenderService.scaleMap()
		this.removeLoadingGifs()
	}

	private allNecessaryRenderDataAvailable(): boolean {
		return (
			fileStatesAvailable(this.storeService.getState().files) &&
			this.storeService.getState().metricData.nodeMetricData !== null &&
			this.areChosenMetricsInMetricData() &&
			_.values(this.storeService.getState().dynamicSettings).every(x => {
				return x !== null && _.values(x).every(x => x !== null)
			})
		)
	}

	private areChosenMetricsInMetricData() {
		const dynamicSettings = this.storeService.getState().dynamicSettings
		return (
			this.nodeMetricDataService.isMetricAvailable(dynamicSettings.areaMetric) &&
			this.nodeMetricDataService.isMetricAvailable(dynamicSettings.colorMetric) &&
			this.nodeMetricDataService.isMetricAvailable(dynamicSettings.heightMetric)
		)
	}

	private removeLoadingGifs() {
		if (this.storeService.getState().appSettings.isLoadingFile) {
			this.storeService.dispatch(setIsLoadingFile(false))
		}
		this.storeService.dispatch(setIsLoadingMap(false))
	}

	private showLoadingMapGif() {
		this.storeService.dispatch(setIsLoadingMap(true))
	}

	private notifyMapChanged() {
		this.$rootScope.$broadcast(CodeMapPreRenderService.RENDER_MAP_CHANGED_EVENT, this.unifiedMap)
	}

	public static subscribe($rootScope: IRootScopeService, subscriber: CodeMapPreRenderServiceSubscriber) {
		$rootScope.$on(CodeMapPreRenderService.RENDER_MAP_CHANGED_EVENT, (_event, data) => {
			subscriber.onRenderMapChanged(data)
		})
	}
}
