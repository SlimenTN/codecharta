import "./codeCharta.module"
import { CodeChartaService } from "./codeCharta.service"
import { getService, instantiateModule } from "../../mocks/ng.mockhelper"
import { TEST_FILE_CONTENT } from "./util/dataMocks"
import { BlacklistType, CCFile, NodeMetricData, NodeType } from "./codeCharta.model"
import { StoreService } from "./state/store.service"
import { resetFiles } from "./state/store/files/files.actions"
import { ExportBlacklistType, ExportCCFile } from "./codeCharta.api.model"
import { getCCFiles, isSingleState } from "./model/files/files.helper"
import { DialogService } from "./ui/dialog/dialog.service"
import { CCValidationResult, ERROR_MESSAGES } from "./util/fileValidator"
import { setNodeMetricData } from "./state/store/metricData/nodeMetricData/nodeMetricData.actions"
import packageJson from "../../package.json"
import { clone } from "./util/clone"

describe("codeChartaService", () => {
	let codeChartaService: CodeChartaService
	let storeService: StoreService
	let dialogService: DialogService
	let validFileContent: ExportCCFile
	let metricData: NodeMetricData[]
	const fileName = "someFileName"

	beforeEach(() => {
		restartSystem()
		rebuildService()
		withMockedDialogService()

		validFileContent = clone(TEST_FILE_CONTENT)
		metricData = clone([
			{ name: "mcc", maxValue: 1 },
			{ name: "rloc", maxValue: 2 }
		])
		storeService.dispatch(resetFiles())
	})

	function restartSystem() {
		instantiateModule("app.codeCharta")
		storeService = getService<StoreService>("storeService")
		dialogService = getService<DialogService>("dialogService")
	}

	function rebuildService() {
		codeChartaService = new CodeChartaService(storeService, dialogService)
	}

	function withMockedDialogService() {
		dialogService = codeChartaService["dialogService"] = jest.fn().mockReturnValue({
			showValidationErrorDialog: jest.fn(),
			showValidationWarningDialog: jest.fn()
		})()
	}

	describe("loadFiles", () => {
		const expected: CCFile = {
			fileMeta: {
				apiVersion: packageJson.codecharta.apiVersion,
				fileName,
				projectName: "Sample Map",
				fileChecksum: "invalid-md5-sample",
				exportedFileSize: 42
			},
			map: {
				attributes: {},
				isExcluded: false,
				isFlattened: false,
				children: [
					{
						attributes: { functions: 10, mcc: 1, rloc: 100 },
						link: "http://www.google.de",
						name: "big leaf",
						path: "/root/big leaf",
						type: NodeType.FILE,
						isExcluded: false,
						isFlattened: false
					},
					{
						attributes: {},
						children: [
							{
								attributes: { functions: 100, mcc: 100, rloc: 30 },
								name: "small leaf",
								path: "/root/Parent Leaf/small leaf",
								type: NodeType.FILE,
								isExcluded: false,
								isFlattened: false
							},
							{
								attributes: { functions: 1000, mcc: 10, rloc: 70 },
								name: "other small leaf",
								path: "/root/Parent Leaf/other small leaf",
								type: NodeType.FILE,
								isExcluded: false,
								isFlattened: false
							}
						],
						name: "Parent Leaf",
						path: "/root/Parent Leaf",
						type: NodeType.FOLDER,
						isExcluded: false,
						isFlattened: false
					}
				],
				name: "root",
				path: "/root",
				type: NodeType.FOLDER
			},
			settings: {
				fileSettings: {
					attributeTypes: { nodes: {}, edges: {} },
					blacklist: [],
					edges: [],
					markedPackages: []
				}
			}
		}

		it("should load a file without edges", () => {
			validFileContent.edges = undefined

			codeChartaService.loadFiles([
				{
					fileName,
					content: validFileContent,
					fileSize: 42
				}
			])

			expect(getCCFiles(storeService.getState().files)[0]).toEqual(expected)
			expect(isSingleState(storeService.getState().files)).toBeTruthy()
		})

		it("should load a valid file", () => {
			codeChartaService.loadFiles([
				{
					fileName,
					content: validFileContent,
					fileSize: 42
				}
			])

			expect(getCCFiles(storeService.getState().files)[0]).toEqual(expected)
			expect(isSingleState(storeService.getState().files)).toBeTruthy()
			expect(dialogService.showValidationWarningDialog).not.toHaveBeenCalled()
			expect(dialogService.showValidationErrorDialog).not.toHaveBeenCalled()
		})

		it("should load the default scenario after loading a valid file", () => {
			storeService.dispatch(setNodeMetricData(metricData))

			codeChartaService.loadFiles([
				{
					fileName,
					content: validFileContent,
					fileSize: 42
				}
			])

			expect(storeService.getState().dynamicSettings.areaMetric).toEqual("rloc")
			expect(storeService.getState().dynamicSettings.heightMetric).toEqual("mcc")
			expect(storeService.getState().dynamicSettings.colorMetric).toEqual("mcc")
		})

		it("should not load the default scenario after loading a valid file, that does not have the required metrics", () => {
			metricData.pop()
			storeService.dispatch(setNodeMetricData(metricData))

			codeChartaService.loadFiles([
				{
					fileName,
					content: validFileContent,
					fileSize: 42
				}
			])

			expect(storeService.getState().dynamicSettings.areaMetric).toBeNull()
			expect(storeService.getState().dynamicSettings.heightMetric).toBeNull()
			expect(storeService.getState().dynamicSettings.colorMetric).toBeNull()
		})

		it("should show error on invalid file", () => {
			const expectedError: CCValidationResult = {
				error: [ERROR_MESSAGES.fileIsInvalid],
				warning: []
			}

			codeChartaService.loadFiles([{ fileName, content: null, fileSize: 0 }])

			expect(storeService.getState().files).toHaveLength(0)
			expect(dialogService.showValidationErrorDialog).toHaveBeenCalledWith(expectedError)
		})

		it("should show error on a random string", () => {
			const expectedError: CCValidationResult = {
				error: [ERROR_MESSAGES.apiVersionIsInvalid],
				warning: []
			}

			codeChartaService.loadFiles([{ fileName, fileSize: 42, content: ("string" as unknown) as ExportCCFile }])

			expect(storeService.getState().files).toHaveLength(0)
			expect(dialogService.showValidationErrorDialog).toHaveBeenCalledWith(expectedError)
		})

		it("should show error if a file is missing a required property", () => {
			const expectedError: CCValidationResult = {
				error: ["Required error:  should have required property 'projectName'"],
				warning: []
			}

			const invalidFileContent = validFileContent
			delete invalidFileContent.projectName
			codeChartaService.loadFiles([{ fileName, fileSize: 42, content: invalidFileContent }])

			expect(storeService.getState().files).toHaveLength(0)
			expect(dialogService.showValidationErrorDialog).toHaveBeenCalledWith(expectedError)
		})

		it("should convert old blacklist type", () => {
			validFileContent.blacklist = [{ path: "foo", type: ExportBlacklistType.hide }]

			codeChartaService.loadFiles([
				{
					fileName,
					content: validFileContent,
					fileSize: 42
				}
			])

			const blacklist = [{ path: "foo", type: BlacklistType.flatten }]
			expect(getCCFiles(storeService.getState().files)[0].settings.fileSettings.blacklist).toEqual(blacklist)
		})

		it("should break the loop after the first invalid file was validated", () => {
			const expectedError: CCValidationResult = {
				error: ["Required error:  should have required property 'projectName'"],
				warning: []
			}

			const invalidFileContent = validFileContent
			delete invalidFileContent.projectName

			codeChartaService.loadFiles([
				{ fileName, content: invalidFileContent, fileSize: 42 },
				{ fileName, content: invalidFileContent, fileSize: 42 }
			])

			expect(dialogService.showValidationErrorDialog).toHaveBeenCalledTimes(1)
			expect(dialogService.showValidationErrorDialog).toHaveBeenCalledWith(expectedError)
		})

		it("should not show a validation error if filenames are duplicated when their path is different", () => {
			validFileContent.nodes[0].children[0].name = "duplicate"
			validFileContent.nodes[0].children[1].children[0].name = "duplicate"

			codeChartaService.loadFiles([{ fileName, content: validFileContent, fileSize: 42 }])

			expect(dialogService.showValidationErrorDialog).toHaveBeenCalledTimes(0)
			expect(storeService.getState().files).toHaveLength(1)
		})

		it("should show a validation error if two files in a folder have the same name", () => {
			validFileContent.nodes[0].children[1].children[0].name = "duplicate"
			validFileContent.nodes[0].children[1].children[1].name = "duplicate"
			const expectedError: CCValidationResult = {
				error: [`${ERROR_MESSAGES.nodesNotUnique} Found duplicate of File with path: /root/Parent Leaf/duplicate`],
				warning: []
			}

			codeChartaService.loadFiles([{ fileName, content: validFileContent, fileSize: 42 }])

			expect(dialogService.showValidationErrorDialog).toHaveBeenCalledTimes(1)
			expect(dialogService.showValidationErrorDialog).toHaveBeenCalledWith(expectedError)
		})

		it("should not show a validation error if two files in a folder have the same name but different type", () => {
			validFileContent.nodes[0].children[1].children[0].name = "duplicate"
			validFileContent.nodes[0].children[1].children[0].type = NodeType.FILE
			validFileContent.nodes[0].children[1].children[1].name = "duplicate"
			validFileContent.nodes[0].children[1].children[1].type = NodeType.FOLDER

			codeChartaService.loadFiles([{ fileName, content: validFileContent, fileSize: 42 }])

			expect(dialogService.showValidationErrorDialog).toHaveBeenCalledTimes(0)
			expect(storeService.getState().files).toHaveLength(1)
		})
	})
})
