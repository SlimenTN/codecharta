import "./edgeChooser.module"
import { EdgeChooserController } from "./edgeChooser.component"
import { instantiateModule, getService } from "../../../../mocks/ng.mockhelper"
import { IRootScopeService, ITimeoutService } from "angular"
import { CodeMapActionsService } from "../codeMap/codeMap.actions.service"
import { CodeMapMouseEventService } from "../codeMap/codeMap.mouseEvent.service"
import { CODE_MAP_BUILDING } from "../../util/dataMocks"
import { StoreService } from "../../state/store.service"
import { EdgeMetricService } from "../../state/store/dynamicSettings/edgeMetric/edgeMetric.service"
import { EdgeMetricDataService } from "../../state/store/metricData/edgeMetricData/edgeMetricData.service"
import { klona } from "klona"

describe("EdgeChooserController", () => {
	let edgeChooserController: EdgeChooserController
	let $rootScope: IRootScopeService
	let storeService: StoreService
	let codeMapActionsService: CodeMapActionsService
	let $timeout: ITimeoutService

	beforeEach(() => {
		restartSystem()
		withMockedCodeMapActionsService()
		rebuildController()
	})

	function restartSystem() {
		instantiateModule("app.codeCharta.ui.edgeChooser")

		$rootScope = getService<IRootScopeService>("$rootScope")
		storeService = getService<StoreService>("storeService")
		codeMapActionsService = getService<CodeMapActionsService>("codeMapActionsService")
		$timeout = getService<ITimeoutService>("$timeout")
	}

	function rebuildController() {
		edgeChooserController = new EdgeChooserController($rootScope, storeService, codeMapActionsService, $timeout)
	}

	function withMockedCodeMapActionsService() {
		codeMapActionsService.updateEdgePreviews = jest.fn()
	}

	describe("constructor", () => {
		it("should subscribe to EdgeMetricDataService", () => {
			EdgeMetricDataService.subscribe = jest.fn()

			rebuildController()

			expect(EdgeMetricDataService.subscribe).toHaveBeenCalledWith($rootScope, edgeChooserController)
		})

		it("should subscribe to hovered buildings", () => {
			CodeMapMouseEventService.subscribeToBuildingHovered = jest.fn()

			rebuildController()

			expect(CodeMapMouseEventService.subscribeToBuildingHovered).toHaveBeenCalledWith($rootScope, edgeChooserController)
		})

		it("should subscribe to unhovered buildings", () => {
			CodeMapMouseEventService.subscribeToBuildingUnhovered = jest.fn()

			rebuildController()

			expect(CodeMapMouseEventService.subscribeToBuildingUnhovered).toHaveBeenCalledWith($rootScope, edgeChooserController)
		})

		it("should subscribe to EdgeMetricService", () => {
			EdgeMetricService.subscribe = jest.fn()

			rebuildController()

			expect(EdgeMetricService.subscribe).toHaveBeenCalledWith($rootScope, edgeChooserController)
		})
	})

	describe("onEdgeMetricDataUpdated", () => {
		it("should store edge data", () => {
			const metricData = [
				{ name: "metric1", maxValue: 22 },
				{ name: "metric2", maxValue: 1 }
			]

			edgeChooserController.onEdgeMetricDataChanged(metricData)

			expect(edgeChooserController["_viewModel"].edgeMetricData.map(x => x.name)).toContain("metric1")
			expect(edgeChooserController["_viewModel"].edgeMetricData.map(x => x.name)).toContain("metric2")
		})
	})

	describe("onBuildingHovered", () => {
		beforeEach(() => {
			edgeChooserController["_viewModel"].edgeMetric = "metric2"
		})

		it("should set hovered value to null if no node is hovered", () => {
			const codeMapBuilding = klona(CODE_MAP_BUILDING)
			codeMapBuilding.setNode(null)
			edgeChooserController["_viewModel"].hoveredEdgeValue = { incoming: 22, outgoing: 42 }

			edgeChooserController.onBuildingHovered(codeMapBuilding)

			expect(edgeChooserController["_viewModel"].hoveredEdgeValue).toEqual(null)
		})

		it("should update hoveredEdgeValue according to hovered building", () => {
			const hoveredEdgeValue = { incoming: 22, outgoing: 23 }
			const codeMapBuilding = klona(CODE_MAP_BUILDING)
			codeMapBuilding.node.edgeAttributes = { metric2: hoveredEdgeValue }

			edgeChooserController.onBuildingHovered(codeMapBuilding)

			expect(edgeChooserController["_viewModel"].hoveredEdgeValue).toEqual(hoveredEdgeValue)
		})
	})

	describe("onBuildingUnhovered", () => {
		it("should set hovered value to null if no node is hovered", () => {
			edgeChooserController["_viewModel"].hoveredEdgeValue = { incoming: 22, outgoing: 42 }

			edgeChooserController.onBuildingUnhovered()

			expect(edgeChooserController["_viewModel"].hoveredEdgeValue).toEqual(null)
		})
	})

	describe("onEdgeMetricChanged", () => {
		it("should set new edgeMetric into viewModel", () => {
			codeMapActionsService.updateEdgePreviews = jest.fn()

			edgeChooserController.onEdgeMetricChanged("myEdgeMetric")

			expect(edgeChooserController["_viewModel"].edgeMetric).toEqual("myEdgeMetric")
		})

		it("should set None as edgeMetric into viewModel", () => {
			codeMapActionsService.updateEdgePreviews = jest.fn()

			edgeChooserController.onEdgeMetricChanged(null)

			expect(edgeChooserController["_viewModel"].edgeMetric).toEqual("None")
		})

		it("should update Edge Previews", () => {
			codeMapActionsService.updateEdgePreviews = jest.fn()

			edgeChooserController.onEdgeMetricChanged("myEdgeMetric")

			expect(codeMapActionsService.updateEdgePreviews).toHaveBeenCalled()
		})
	})

	describe("onEdgeMetricSelected", () => {
		it("should update edgeMetric in store", () => {
			codeMapActionsService.updateEdgePreviews = jest.fn()
			edgeChooserController["_viewModel"].edgeMetric = "metric1"

			edgeChooserController.onEdgeMetricSelected()

			expect(storeService.getState().dynamicSettings.edgeMetric).toEqual("metric1")
		})
	})

	describe("filterMetricData()", () => {
		it("should return the all entries if search term is empty", () => {
			const metricData = [
				{ name: "metric1", maxValue: 1 },
				{ name: "metric2", maxValue: 2 }
			]
			edgeChooserController["_viewModel"].searchTerm = ""
			edgeChooserController.onEdgeMetricDataChanged(metricData)

			edgeChooserController.filterMetricData()

			expect(edgeChooserController["_viewModel"].edgeMetricData).toEqual(metricData)
		})

		it("should return only metrics that include search term", () => {
			const metricData = [
				{ name: "metric1", maxValue: 1 },
				{ name: "metric2", maxValue: 2 }
			]
			edgeChooserController["_viewModel"].searchTerm = "ic2"
			edgeChooserController.onEdgeMetricDataChanged(metricData)

			edgeChooserController.filterMetricData()

			expect(edgeChooserController["_viewModel"].edgeMetricData).toEqual([{ name: "metric2", maxValue: 2 }])
		})

		it("should return an empty metric list if it doesn't have the searchTerm as substring", () => {
			const metricData = [
				{ name: "metric1", maxValue: 1 },
				{ name: "metric2", maxValue: 2 }
			]
			edgeChooserController["_viewModel"].searchTerm = "fooBar"
			edgeChooserController.onEdgeMetricDataChanged(metricData)

			edgeChooserController.filterMetricData()

			expect(edgeChooserController["_viewModel"].edgeMetricData).toEqual([])
		})
	})
	describe("clearSearchTerm()", () => {
		it("should return an empty string, when function is called", () => {
			edgeChooserController["_viewModel"].searchTerm = "someString"

			edgeChooserController.clearSearchTerm()

			expect(edgeChooserController["_viewModel"].searchTerm).toEqual("")
		})

		it("should return the the metricData Array with all Elements, when function is called", () => {
			const metricData = [{ name: "metric1", maxValue: 1 }]
			edgeChooserController["_viewModel"].searchTerm = "rlo"
			edgeChooserController.onEdgeMetricDataChanged(metricData)

			edgeChooserController.clearSearchTerm()

			expect(edgeChooserController["_viewModel"].edgeMetricData).toEqual(metricData)
		})
	})
})
