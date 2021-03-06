import "./codeMap.module"
import "../../codeCharta.module"
import { IRootScopeService, IWindowService } from "angular"
import { ClickType, CodeMapMouseEventService, CursorType } from "./codeMap.mouseEvent.service"
import { ThreeCameraService } from "./threeViewer/threeCameraService"
import { ThreeSceneService } from "./threeViewer/threeSceneService"
import { ThreeUpdateCycleService } from "./threeViewer/threeUpdateCycleService"
import { getService, instantiateModule } from "../../../../mocks/ng.mockhelper"
import { ThreeRendererService } from "./threeViewer/threeRendererService"
import { MapTreeViewLevelController } from "../mapTreeView/mapTreeView.level.component"
import { ViewCubeMouseEventsService } from "../viewCube/viewCube.mouseEvents.service"
import { CodeMapBuilding } from "./rendering/codeMapBuilding"
import { CODE_MAP_BUILDING, CONSTANT_HIGHLIGHT, DEFAULT_STATE, TEST_FILE_WITH_PATHS, withMockedEventMethods } from "../../util/dataMocks"
import { BlacklistType, CCFile, CodeMapNode, Node } from "../../codeCharta.model"
import { BlacklistService } from "../../state/store/fileSettings/blacklist/blacklist.service"
import { FilesService } from "../../state/store/files/files.service"
import { StoreService } from "../../state/store.service"
import { NodeDecorator } from "../../util/nodeDecorator"
import { setIdToBuilding } from "../../state/store/lookUp/idToBuilding/idToBuilding.actions"
import { setIdToNode } from "../../state/store/lookUp/idToNode/idToNode.actions"
import { klona } from "klona"
import { Box3, Vector3 } from "three"

describe("codeMapMouseEventService", () => {
	let codeMapMouseEventService: CodeMapMouseEventService

	let $rootScope: IRootScopeService
	let $window: IWindowService
	let threeCameraService: ThreeCameraService
	let threeRendererService: ThreeRendererService
	let threeSceneService: ThreeSceneService
	let threeUpdateCycleService: ThreeUpdateCycleService
	let storeService: StoreService

	let codeMapBuilding: CodeMapBuilding
	let file: CCFile

	beforeEach(() => {
		restartSystem()
		rebuildService()
		withMockedWindow()
		withMockedThreeUpdateCycleService()
		withMockedThreeRendererService()
		withMockedViewCubeMouseEventsService()
		withMockedThreeCameraService()
		withMockedThreeSceneService()
		withMockedEventMethods($rootScope)
		NodeDecorator.decorateMap(TEST_FILE_WITH_PATHS.map, DEFAULT_STATE.metricData, [])
	})

	function restartSystem() {
		instantiateModule("app.codeCharta.ui.codeMap")

		$rootScope = getService<IRootScopeService>("$rootScope")
		$window = getService<IWindowService>("$window")
		threeCameraService = getService<ThreeCameraService>("threeCameraService")
		threeRendererService = getService<ThreeRendererService>("threeRendererService")
		threeSceneService = getService<ThreeSceneService>("threeSceneService")
		threeUpdateCycleService = getService<ThreeUpdateCycleService>("threeUpdateCycleService")
		storeService = getService<StoreService>("storeService")

		codeMapBuilding = klona(CODE_MAP_BUILDING)
		file = klona(TEST_FILE_WITH_PATHS)
		document.body.style.cursor = CursorType.Default
	}

	function rebuildService() {
		codeMapMouseEventService = new CodeMapMouseEventService(
			$rootScope,
			$window,
			threeCameraService,
			threeRendererService,
			threeSceneService,
			threeUpdateCycleService,
			storeService
		)

		codeMapMouseEventService["oldMouse"] = { x: 1, y: 1 }
	}

	function withMockedWindow() {
		$window.open = jest.fn()
	}

	function withMockedThreeUpdateCycleService() {
		threeUpdateCycleService = codeMapMouseEventService["threeUpdateCycleService"] = jest.fn().mockReturnValue({
			register: jest.fn()
		})()
	}

	function withMockedThreeRendererService() {
		threeRendererService = codeMapMouseEventService["threeRendererService"] = jest.fn().mockReturnValue({
			renderer: {
				domElement: {
					addEventListener: jest.fn()
				}
			}
		})()
	}

	function withMockedViewCubeMouseEventsService() {
		ViewCubeMouseEventsService.subscribeToEventPropagation = jest.fn()
	}

	function withMockedThreeCameraService() {
		threeCameraService = codeMapMouseEventService["threeCameraService"] = jest.fn().mockReturnValue({
			camera: {
				updateMatrixWorld: jest.fn()
			}
		})()
	}

	function withMockedThreeSceneService() {
		threeSceneService = codeMapMouseEventService["threeSceneService"] = jest.fn().mockReturnValue({
			getMapMesh: jest.fn().mockReturnValue({
				clearHighlight: jest.fn(),
				highlightSingleBuilding: jest.fn(),
				clearSelection: jest.fn(),
				selectBuilding: jest.fn(),
				getMeshDescription: jest.fn().mockReturnValue({
					buildings: [codeMapBuilding]
				})
			}),
			clearHighlight: jest.fn(),
			highlightSingleBuilding: jest.fn(),
			clearSelection: jest.fn(),
			clearConstantHighlight: jest.fn(),
			clearHoverHighlight: jest.fn(),
			selectBuilding: jest.fn(),
			getSelectedBuilding: jest.fn().mockReturnValue(CODE_MAP_BUILDING),
			getHighlightedBuilding: jest.fn().mockReturnValue(CODE_MAP_BUILDING),
			getConstantHighlight: jest.fn().mockReturnValue(new Map()),
			addBuildingToHighlightingList: jest.fn(),
			highlightBuildings: jest.fn()
		})()
	}

	describe("constructor", () => {
		it("should subscribe to hoverEvents", () => {
			MapTreeViewLevelController.subscribeToHoverEvents = jest.fn()

			rebuildService()

			expect(MapTreeViewLevelController.subscribeToHoverEvents).toHaveBeenCalled()
		})

		it("should call register on threeUpdateCycleService", () => {
			rebuildService()

			expect(threeUpdateCycleService.register).toHaveBeenCalled()
		})

		it("should subscribe to BlacklistService", () => {
			BlacklistService.subscribe = jest.fn()

			rebuildService()

			expect(BlacklistService.subscribe).toHaveBeenCalledWith($rootScope, codeMapMouseEventService)
		})

		it("should subscribe to FilesService", () => {
			FilesService.subscribe = jest.fn()

			rebuildService()

			expect(FilesService.subscribe).toHaveBeenCalledWith($rootScope, codeMapMouseEventService)
		})
	})

	describe("start", () => {
		it("should setup four event listeners", () => {
			codeMapMouseEventService.start()

			expect(threeRendererService.renderer.domElement.addEventListener).toHaveBeenCalledTimes(4)
		})

		it("should subscribe to event propagation", () => {
			ViewCubeMouseEventsService.subscribeToEventPropagation = jest.fn()

			codeMapMouseEventService.start()

			expect(ViewCubeMouseEventsService.subscribeToEventPropagation).toHaveBeenCalledWith($rootScope, codeMapMouseEventService)
		})
	})

	describe("onViewCubeEventPropagation", () => {
		beforeEach(() => {
			codeMapMouseEventService.onDocumentMouseMove = jest.fn()
			codeMapMouseEventService.onDocumentMouseDown = jest.fn()
			codeMapMouseEventService.onDocumentMouseUp = jest.fn()
			codeMapMouseEventService.onDocumentDoubleClick = jest.fn()
		})

		it("should call onDocumentMouseMove", () => {
			codeMapMouseEventService.onViewCubeEventPropagation("mousemove", null)

			expect(codeMapMouseEventService.onDocumentMouseMove).toHaveBeenCalledWith(null)
		})

		it("should call onDocumentMouseDown", () => {
			codeMapMouseEventService.onViewCubeEventPropagation("mousedown", null)

			expect(codeMapMouseEventService.onDocumentMouseDown).toHaveBeenCalledWith(null)
			expect(codeMapMouseEventService.onDocumentDoubleClick).not.toHaveBeenCalled()
		})

		it("should call onDocumentMouseUp", () => {
			codeMapMouseEventService.onViewCubeEventPropagation("mouseup", null)

			expect(codeMapMouseEventService.onDocumentMouseUp).toHaveBeenCalled()
		})

		it("should call onDocumentDoubleClick", () => {
			codeMapMouseEventService.onViewCubeEventPropagation("dblclick", null)

			expect(codeMapMouseEventService.onDocumentDoubleClick).toHaveBeenCalled()
		})
	})

	describe("onFilesSelectionChanged", () => {
		it("should deselect the building", () => {
			codeMapMouseEventService.onFilesSelectionChanged()

			expect(threeSceneService.clearSelection).toHaveBeenCalled()
		})
	})

	describe("onBlacklistChanged", () => {
		it("should deselect the building when the selected building is excluded", () => {
			const blacklist = [{ path: CODE_MAP_BUILDING.node.path, type: BlacklistType.exclude }]

			codeMapMouseEventService.onBlacklistChanged(blacklist)

			expect(threeSceneService.clearSelection).toHaveBeenCalled()
		})

		it("should deselect the building when the selected building is hidden", () => {
			const blacklist = [{ path: CODE_MAP_BUILDING.node.path, type: BlacklistType.flatten }]

			codeMapMouseEventService.onBlacklistChanged(blacklist)

			expect(threeSceneService.clearSelection).toHaveBeenCalled()
		})

		it("should not deselect the building when the selected building is not blacklisted", () => {
			codeMapMouseEventService.onBlacklistChanged([])

			expect(threeSceneService.clearSelection).not.toHaveBeenCalled()
		})

		it("should not deselect the building when no building is selected", () => {
			threeSceneService.getSelectedBuilding = jest.fn()

			codeMapMouseEventService.onBlacklistChanged([])

			expect(threeSceneService.clearSelection).not.toHaveBeenCalled()
		})
	})

	describe("updateHovering", () => {
		beforeEach(() => {
			threeSceneService.getMapMesh = jest.fn().mockReturnValue({
				checkMouseRayMeshIntersection: jest.fn()
			})
			codeMapMouseEventService["transformHTMLToSceneCoordinates"] = jest.fn().mockReturnValue({ x: 0, y: 1 })

			const idToBuilding = new Map<number, CodeMapBuilding>()
			idToBuilding.set(CODE_MAP_BUILDING.node.id, CODE_MAP_BUILDING)
			const idToNode = new Map<number, CodeMapNode>()
			idToNode.set(file.map.id, file.map)
			storeService.dispatch(setIdToBuilding(idToBuilding))
			storeService.dispatch(setIdToNode(idToNode))
		})

		it("should call updateMatrixWorld", () => {
			codeMapMouseEventService["modifiedLabel"] = null

			codeMapMouseEventService.updateHovering()

			expect(threeCameraService.camera.updateMatrixWorld).toHaveBeenCalledWith(false)
		})

		it("should un-highlight the building, when no intersection was found and a  building is hovered", () => {
			codeMapMouseEventService["modifiedLabel"] = null
			codeMapMouseEventService["highlightedInTreeView"] = null

			codeMapMouseEventService.updateHovering()

			expect(threeSceneService.clearHighlight).toHaveBeenCalled()
		})

		it("should hover a node when an intersection was found and the cursor is set to pointing", () => {
			codeMapMouseEventService["modifiedLabel"] = null
			threeSceneService.getMapMesh = jest.fn().mockReturnValue({
				checkMouseRayMeshIntersection: jest.fn().mockReturnValue(CODE_MAP_BUILDING)
			})
			threeSceneService.getHighlightedBuilding = jest.fn()

			codeMapMouseEventService.updateHovering()

			expect(threeSceneService.addBuildingToHighlightingList).toHaveBeenCalled()
			expect(threeSceneService.highlightBuildings).toHaveBeenCalled()
			expect(document.body.style.cursor).toEqual(CursorType.Pointer)
		})

		it("should not highlight node when an intersection was found and the cursor is set to grabbing", () => {
			codeMapMouseEventService["modifiedLabel"] = null
			threeSceneService.getMapMesh = jest.fn().mockReturnValue({
				checkMouseRayMeshIntersection: jest.fn().mockReturnValue(CODE_MAP_BUILDING)
			})
			codeMapMouseEventService["isGrabbing"] = true
			CodeMapMouseEventService.changeCursorIndicator(CursorType.Grabbing)
			threeSceneService.getHighlightedBuilding = jest.fn()

			codeMapMouseEventService.updateHovering()

			expect(threeSceneService.addBuildingToHighlightingList).not.toHaveBeenCalled()
			expect(threeSceneService.highlightBuildings).not.toHaveBeenCalled()
			expect(document.body.style.cursor).toEqual(CursorType.Grabbing)
		})

		it("should not highlight a node when an intersection was found and the cursor is set to moving", () => {
			codeMapMouseEventService["modifiedLabel"] = null
			threeSceneService.getMapMesh = jest.fn().mockReturnValue({
				checkMouseRayMeshIntersection: jest.fn().mockReturnValue(CODE_MAP_BUILDING)
			})
			codeMapMouseEventService["isMoving"] = true
			CodeMapMouseEventService.changeCursorIndicator(CursorType.Moving)
			threeSceneService.getHighlightedBuilding = jest.fn()

			codeMapMouseEventService.updateHovering()

			expect(threeSceneService.addBuildingToHighlightingList).not.toHaveBeenCalled()
			expect(threeSceneService.highlightBuildings).not.toHaveBeenCalled()
			expect(document.body.style.cursor).toEqual(CursorType.Moving)
		})

		it("should not highlight a node again when the intersection building is the same", () => {
			codeMapMouseEventService["modifiedLabel"] = null
			threeSceneService.getMapMesh = jest.fn().mockReturnValue({
				checkMouseRayMeshIntersection: jest.fn().mockReturnValue(CODE_MAP_BUILDING)
			})

			codeMapMouseEventService.updateHovering()

			expect(threeSceneService.highlightSingleBuilding).not.toHaveBeenCalled()
		})
	})

	describe("getIntersectionDistance", () => {
		let bboxOverlap = null
		let bboxHovered = null
		let bboxMiss = null
		let normedVector = null
		let bboxContain = null
		const overlapDistance = 2

		beforeEach(() => {
			bboxOverlap = new Box3(new Vector3(2, 2, 2), new Vector3(4, 4, 4))
			bboxHovered = new Box3(new Vector3(1, 1, 1), new Vector3(2, 2, 2))
			bboxMiss = new Box3(new Vector3(5, 5, 5), new Vector3(6, 6, 6))
			bboxContain = new Box3(new Vector3(3, 3, 3), new Vector3(4, 4, 4))
			normedVector = new Vector3(1, 1, 1)
		})

		it("should calculate distance if labels partially overlap", () => {
			const distance = codeMapMouseEventService.getIntersectionDistance(bboxHovered, bboxOverlap, normedVector, overlapDistance)
			expect(distance).toEqual(overlapDistance)
		})

		it("should calculate distance if labels fully overlap", () => {
			const distance = codeMapMouseEventService.getIntersectionDistance(bboxHovered, bboxContain, normedVector, overlapDistance)
			expect(distance).toEqual(overlapDistance)
		})

		it("should return 0 if labels dont overlap", () => {
			const distance = codeMapMouseEventService.getIntersectionDistance(bboxHovered, bboxMiss, normedVector, overlapDistance)
			expect(distance).toEqual(0)
		})
	})

	describe("changeCursorIndicator", () => {
		it("should set the mouseIcon to grabbing", () => {
			CodeMapMouseEventService.changeCursorIndicator(CursorType.Grabbing)

			expect(document.body.style.cursor).toEqual(CursorType.Grabbing)
		})

		it("should set the mouseIcon to default", () => {
			document.body.style.cursor = CursorType.Pointer

			CodeMapMouseEventService.changeCursorIndicator(CursorType.Default)

			expect(document.body.style.cursor).toEqual(CursorType.Default)
		})
	})

	describe("onDocumentMouseUp", () => {
		let event

		describe("on left click", () => {
			beforeEach(() => {
				event = { button: ClickType.LeftClick, clientX: 10, clientY: 20 }
			})
			it("should change the cursor to default when the left click is triggered", () => {
				document.body.style.cursor = CursorType.Pointer

				codeMapMouseEventService.onDocumentMouseUp(event)

				expect(document.body.style.cursor).toEqual(CursorType.Default)
			})

			it("should not do anything when no building is highlight and nothing is selected", () => {
				threeSceneService.getHighlightedBuilding = jest.fn()
				threeSceneService.getSelectedBuilding = jest.fn()

				codeMapMouseEventService.onDocumentMouseUp(event)

				expect(threeSceneService.selectBuilding).not.toHaveBeenCalled()
			})

			it("should call selectBuilding when no building is selected", () => {
				threeSceneService.getSelectedBuilding = jest.fn()
				codeMapMouseEventService["intersectedBuilding"] = codeMapBuilding

				codeMapMouseEventService.onDocumentMouseUp(event)

				expect(threeSceneService.selectBuilding).toHaveBeenCalledWith(codeMapBuilding)
			})

			it("should call selectBuilding when a new building is selected", () => {
				threeSceneService.getSelectedBuilding = jest.fn().mockReturnValue(new CodeMapBuilding(200, null, null, null))
				codeMapMouseEventService["intersectedBuilding"] = codeMapBuilding

				codeMapMouseEventService.onDocumentMouseUp(event)

				expect(threeSceneService.selectBuilding).toHaveBeenCalledWith(codeMapBuilding)
			})

			it("should call clearselection, when the mouse has moved less or exact 3 pixels while left button was pressed", () => {
				codeMapMouseEventService.onDocumentMouseMove(event)
				codeMapMouseEventService.onDocumentMouseDown(event)
				codeMapMouseEventService.onDocumentMouseMove({ clientX: 10, clientY: 17 } as MouseEvent)

				codeMapMouseEventService.onDocumentMouseUp(event)

				expect(threeSceneService.clearSelection).toHaveBeenCalled()
			})

			it("should not call clear selection, when mouse has moved more than 3 pixels while left button was pressed", () => {
				codeMapMouseEventService.onDocumentMouseMove(event)
				codeMapMouseEventService.onDocumentMouseDown(event)
				codeMapMouseEventService.onDocumentMouseMove({ clientX: 6, clientY: 20 } as MouseEvent)

				codeMapMouseEventService.onDocumentMouseUp(event)

				expect(threeSceneService.clearSelection).not.toHaveBeenCalled()
			})
		})

		describe("on right click", () => {
			beforeEach(() => {
				event = { button: ClickType.RightClick, clientX: 0, clientY: 1 }
			})

			it("should $broadcast a building-right-clicked event", () => {
				codeMapMouseEventService.onDocumentMouseMove(event)
				codeMapMouseEventService.onDocumentMouseDown(event)

				codeMapMouseEventService.onDocumentMouseUp(event)

				expect($rootScope.$broadcast).toHaveBeenCalled()
			})

			it("should not $broadcast a building-right-clicked event when no intersection was found", () => {
				threeSceneService.getHighlightedBuilding = jest.fn()

				codeMapMouseEventService.onDocumentMouseMove(event)
				codeMapMouseEventService.onDocumentMouseDown(event)

				codeMapMouseEventService.onDocumentMouseUp(event)

				expect($rootScope.$broadcast).not.toHaveBeenCalledWith("building-right-clicked")
			})

			it("should not $broadcast a building-right-clicked event when the mouse has moved more than 3 Pixels since last click", () => {
				codeMapMouseEventService.onDocumentMouseMove(event)
				codeMapMouseEventService.onDocumentMouseDown(event)
				codeMapMouseEventService.onDocumentMouseMove({ clientX: 10, clientY: 20 } as MouseEvent)

				codeMapMouseEventService.onDocumentMouseUp(event)

				expect($rootScope.$broadcast).not.toHaveBeenCalledWith("building-right-clicked")
			})
		})
	})

	describe("onDocumentMouseDown", () => {
		it("should change the cursor to moving when pressing the right button", () => {
			const event = { button: ClickType.RightClick } as MouseEvent

			codeMapMouseEventService.onDocumentMouseDown(event)

			expect(document.body.style.cursor).toEqual(CursorType.Moving)
		})

		it("should change the cursor to grabbing when pressing the left button just once", () => {
			const event = { button: ClickType.LeftClick } as MouseEvent

			codeMapMouseEventService.onDocumentMouseDown(event)

			expect(document.body.style.cursor).toEqual(CursorType.Grabbing)
		})

		it("should save the mouse position", () => {
			const event = { clientX: 10, clientY: 20 } as MouseEvent

			codeMapMouseEventService.onDocumentMouseDown(event)

			expect(codeMapMouseEventService["mouseOnLastClick"]).toEqual({ x: event.clientX, y: event.clientY })
		})
	})

	describe("onDocumentDoubleClick", () => {
		it("should return if highlighted is null", () => {
			threeSceneService.getHighlightedBuilding = jest.fn()

			codeMapMouseEventService.onDocumentDoubleClick()

			expect($window.open).not.toHaveBeenCalled()
		})

		it("should not do anything if hovered.node.link is null", () => {
			threeSceneService.getHighlightedBuilding = jest.fn()

			codeMapBuilding.setNode({ link: null } as Node)

			codeMapMouseEventService["hoveredInCodeMap"] = codeMapBuilding

			codeMapMouseEventService.onDocumentDoubleClick()

			expect($window.open).not.toHaveBeenCalled()
		})

		it("should call open with link if hovered.node.link is defined", () => {
			codeMapMouseEventService["hoveredInCodeMap"] = codeMapBuilding

			codeMapMouseEventService.onDocumentDoubleClick()

			expect($window.open).toHaveBeenCalledWith("NO_LINK", "_blank")
		})
	})

	describe("unhoverBuilding", () => {
		it("should clear the highlight when to is null and constantHighlight is empty", () => {
			codeMapMouseEventService["unhoverBuilding"]()

			expect($rootScope.$broadcast).toHaveBeenCalledWith("building-unhovered")
			expect(threeSceneService.clearHighlight).toHaveBeenCalled()
		})

		it("should only clear the hovered highlight when to is null but constantHighlight is not empty", () => {
			threeSceneService.getConstantHighlight = jest.fn().mockReturnValue(CONSTANT_HIGHLIGHT)
			codeMapMouseEventService["unhoverBuilding"]()

			expect($rootScope.$broadcast).toHaveBeenCalledWith("building-unhovered")
			expect(threeSceneService.clearHoverHighlight).toHaveBeenCalled()
		})
	})

	describe("hoverBuilding", () => {
		beforeEach(() => {
			const idToBuilding = new Map<number, CodeMapBuilding>()
			idToBuilding.set(codeMapBuilding.node.id, codeMapBuilding)
			const idToNode = new Map<number, CodeMapNode>()
			idToNode.set(file.map.id, file.map)
			storeService.dispatch(setIdToBuilding(idToBuilding))
			storeService.dispatch(setIdToNode(idToNode))
		})

		it("should set the highlight when to is not null", () => {
			codeMapMouseEventService["hoverBuilding"](codeMapBuilding)

			expect(threeSceneService.addBuildingToHighlightingList).toHaveBeenCalledWith(codeMapBuilding)
			expect(threeSceneService.highlightBuildings).toHaveBeenCalled()
		})
	})

	describe("onShouldHoverNode", () => {
		beforeEach(() => {
			codeMapMouseEventService["hoverBuilding"] = jest.fn()
		})

		it("should call threeSceneService.getMapDescription", () => {
			codeMapMouseEventService.onShouldHoverNode(file.map)

			expect(threeSceneService.getMapMesh().getMeshDescription).toHaveBeenCalled()
		})

		it("should call onBuildingHovered", () => {
			codeMapBuilding.node.path = file.map.path
			threeSceneService.getHighlightedBuilding = jest.fn()

			codeMapMouseEventService.onShouldHoverNode(file.map)

			expect(codeMapMouseEventService["hoverBuilding"]).toHaveBeenCalledWith(codeMapBuilding)
		})
	})

	describe("onShouldUnhoverNode", () => {
		it("should call onBuildingHovered", () => {
			codeMapMouseEventService["unhoverBuilding"] = jest.fn()
			codeMapMouseEventService["highlightedInTreeView"] = codeMapBuilding

			codeMapMouseEventService.onShouldUnhoverNode()

			expect(codeMapMouseEventService["unhoverBuilding"]).toHaveBeenCalled()
		})
	})
})
