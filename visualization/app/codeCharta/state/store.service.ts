import { createStore, Store } from "redux"
import rootReducer from "./store/reducer"
import { CCAction, DynamicSettings, FileSettings, FileState, RecursivePartial, State } from "../codeCharta.model"
import { IRootScopeService } from "angular"
import { splitStateActions } from "./store/state.splitter"
import { FileStateService, FileStateServiceSubscriber } from "./fileState.service"
import { unfocusNode } from "./store/dynamicSettings/focusedNodePath/focusedNodePath.actions"
import { setSearchedNodePaths } from "./store/dynamicSettings/searchedNodePaths/searchedNodePaths.actions"
import { setSearchPattern } from "./store/dynamicSettings/searchPattern/searchPattern.actions"
import { setMargin } from "./store/dynamicSettings/margin/margin.actions"
import { setColorRange } from "./store/dynamicSettings/colorRange/colorRange.actions"
import { setFileSettings } from "./store/fileSettings/fileSettings.actions"
import { FileStateHelper } from "../util/fileStateHelper"
import { SettingsMerger } from "../util/settingsMerger"
import { SettingsService } from "./settingsService/settings.service"
import { defaultState } from "./store/state.actions"

export interface StoreSubscriber {
	onStoreChanged(actionType: string)
}

export class StoreService implements FileStateServiceSubscriber {
	private static STORE_CHANGED_EVENT = "store-changed"
	private store: Store

	/* @ngInject */
	constructor(private $rootScope: IRootScopeService, private settingsService: SettingsService) {
		this.store = createStore(rootReducer)
		FileStateService.subscribe(this.$rootScope, this)
	}

	public onFileSelectionStatesChanged(fileStates: FileState[]) {
		this.resetDynamicAndFileSettings(fileStates)
	}

	public onImportedFilesChanged(fileStates: FileState[]) {}

	public dispatch(action: CCAction, isSilent: boolean = false) {
		splitStateActions(action).forEach(atomicAction => {
			this.store.dispatch(atomicAction)
			if (!isSilent) {
				this.notify(atomicAction.type)
			}
		})
	}

	public getState(): State {
		return this.store.getState()
	}

	private resetDynamicAndFileSettings(fileStates: FileState[]) {
		this.settingsService.updateSettings({
			dynamicSettings: this.getDefaultDynamicSettingsWithoutMetrics()
		})
		this.dispatch(unfocusNode())
		this.dispatch(setSearchedNodePaths())
		this.dispatch(setSearchPattern())
		this.dispatch(setMargin())
		this.dispatch(setColorRange())

		const fileSettings = this.getNewFileSettings(fileStates)
		this.settingsService.updateSettings({
			fileSettings
		})
		this.dispatch(setFileSettings(fileSettings))
	}

	private getDefaultDynamicSettingsWithoutMetrics(): RecursivePartial<DynamicSettings> {
		return {
			focusedNodePath: defaultState.dynamicSettings.focusedNodePath,
			searchedNodePaths: defaultState.dynamicSettings.searchedNodePaths,
			searchPattern: defaultState.dynamicSettings.searchPattern,
			margin: defaultState.dynamicSettings.margin,
			colorRange: defaultState.dynamicSettings.colorRange
		}
	}

	private getNewFileSettings(fileStates: FileState[]): FileSettings {
		let withUpdatedPath = !!FileStateHelper.isPartialState(fileStates)
		let visibleFiles = FileStateHelper.getVisibleFileStates(fileStates).map(x => x.file)
		return SettingsMerger.getMergedFileSettings(visibleFiles, withUpdatedPath)
	}

	private notify(actionType: string) {
		this.$rootScope.$broadcast(StoreService.STORE_CHANGED_EVENT, { actionType: actionType })
	}

	public static subscribe($rootScope: IRootScopeService, subscriber: StoreSubscriber) {
		$rootScope.$on(StoreService.STORE_CHANGED_EVENT, (event, data) => {
			subscriber.onStoreChanged(data.actionType)
		})
	}
}
