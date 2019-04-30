import angular from "angular"
import * as d3 from "d3"
import { CCFile, CodeMapNode } from "../codeCharta.model"
import { Tokens } from "marked"

export class FileDownloader {
	public static downloadCurrentMap(file: CCFile) {
		const data = this.getProjectDataAsCCJsonFormat(file)
		this.downloadData(data, this.getNewFileName(file))
	}

	private static getProjectDataAsCCJsonFormat(file: CCFile) {
		let newFileName = this.getNewFileName(file)

		return {
			fileName: newFileName,
			projectName: file.fileMeta.projectName,
			apiVersion: file.fileMeta.apiVersion,
			nodes: [this.removeJsonHashkeysAndVisibleAttribute(file.map)],
			edges: file.settings.fileSettings.edges,
			attributeTypes: file.settings.fileSettings.attributeTypes,
			blacklist: file.settings.fileSettings.blacklist
		}
	}

	private static removeJsonHashkeysAndVisibleAttribute(map: CodeMapNode) {
		let copy = JSON.parse(JSON.stringify(map))
		d3.hierarchy(copy).each(node => {
			delete node.data.visible
		})
		return copy
	}

	private static getNewFileName(file: CCFile) {
		return this.addDateToFileName(file.fileMeta.fileName)
	}

	private static addDateToFileName(fileName) {
		const date = new Date()
		const dateString =
			date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + "_" + date.getHours() + "-" + date.getMinutes()
		let firstToken = fileName.split(".")[0]
		return firstToken + "." + dateString + ".cc.json"
	}

	private static downloadData(data, fileName) {
		let dataJson = data
		if (typeof data === "object") {
			dataJson = angular.toJson(data, 4)
		}

		const blob = new Blob([dataJson], { type: "text/json" })
		const e = document.createEvent("MouseEvents")
		const a = document.createElement("a")

		a.download = fileName
		a.href = window.URL.createObjectURL(blob)
		a.dataset.downloadurl = ["text/json", a.download, a.href].join(":")
		e.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
		a.dispatchEvent(e)
	}
}
