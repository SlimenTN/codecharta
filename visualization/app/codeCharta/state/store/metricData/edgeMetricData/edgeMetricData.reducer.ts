import { EdgeMetricDataAction, EdgeMetricDataActions, setEdgeMetricData } from "./edgeMetricData.actions"
import { BlacklistItem, BlacklistType, Edge, EdgeMetricCount, EdgeMetricData } from "../../../../codeCharta.model"
import { getVisibleFileStates } from "../../../../model/files/files.helper"
import { CodeMapHelper } from "../../../../util/codeMapHelper"
import { FileState } from "../../../../model/files/files"
import { EdgeMetricDataService } from "./edgeMetricData.service"
import { sortByMetricName } from "../metricData.reducer"

const clone = require("rfdc")()

export type EdgeMetricCountMap = Map<string, EdgeMetricCount>
export type NodeEdgeMetricsMap = Map<string, EdgeMetricCountMap>
// Required for performance improvements
export let nodeEdgeMetricsMap: NodeEdgeMetricsMap = new Map()

export function edgeMetricData(state: EdgeMetricData[] = setEdgeMetricData().payload, action: EdgeMetricDataAction): EdgeMetricData[] {
	switch (action.type) {
		case EdgeMetricDataActions.SET_EDGE_METRIC_DATA:
			return clone(action.payload)
		case EdgeMetricDataActions.CALCULATE_NEW_EDGE_METRIC_DATA:
			return calculateMetrics(action.payload.fileStates, action.payload.blacklist)
		default:
			return state
	}
}

function calculateMetrics(fileStates: FileState[], blacklist: BlacklistItem[]) {
	nodeEdgeMetricsMap = new Map()
	const allVisibleFileStates = getVisibleFileStates(fileStates)
	const allFilePaths = allVisibleFileStates.flatMap(fileState => CodeMapHelper.getAllPaths(fileState.file.map))
	for (const fileState of allVisibleFileStates) {
		fileState.file.settings.fileSettings.edges.forEach(edge => {
			if (bothNodesAssociatedAreVisible(edge, allFilePaths, blacklist)) {
				addEdgeToCalculationMap(edge)
			}
		})
	}
	const newEdgeMetricData = getMetricDataFromMap()
	sortByMetricName(newEdgeMetricData)
	return newEdgeMetricData
}

function bothNodesAssociatedAreVisible(edge: Edge, filePaths: string[], blacklist: BlacklistItem[]): boolean {
	const fromPath = filePaths.find(x => x === edge.fromNodeName)
	const toPath = filePaths.find(x => x === edge.toNodeName)
	return fromPath && toPath && isNotBlacklisted(fromPath, blacklist) && isNotBlacklisted(toPath, blacklist)
}

function isNotBlacklisted(path: string, blacklist: BlacklistItem[]): boolean {
	return !CodeMapHelper.isPathBlacklisted(path, blacklist, BlacklistType.exclude)
}

function addEdgeToCalculationMap(edge: Edge) {
	for (const edgeMetric of Object.keys(edge.attributes)) {
		const edgeMetricEntry = getEntryForMetric(edgeMetric)
		addEdgeToNodes(edgeMetricEntry, edge.fromNodeName, edge.toNodeName)
	}
}

function getEntryForMetric(edgeMetricName: string): EdgeMetricCountMap {
	let nodeEdgeMetric = nodeEdgeMetricsMap.get(edgeMetricName)
	if (!nodeEdgeMetric) {
		nodeEdgeMetric = new Map()
		nodeEdgeMetricsMap.set(edgeMetricName, nodeEdgeMetric)
	}
	return nodeEdgeMetric
}

function addEdgeToNodes(edgeMetricEntry: EdgeMetricCountMap, fromNode: string, toNode: string) {
	const fromNodeEdgeMetric = edgeMetricEntry.get(fromNode)
	if (fromNodeEdgeMetric === undefined) {
		edgeMetricEntry.set(fromNode, { incoming: 0, outgoing: 1 })
	} else {
		fromNodeEdgeMetric.outgoing += 1
	}
	const toNodeEdgeMetric = edgeMetricEntry.get(toNode)
	if (toNodeEdgeMetric === undefined) {
		edgeMetricEntry.set(toNode, { incoming: 1, outgoing: 0 })
	} else {
		toNodeEdgeMetric.incoming += 1
	}
}

function getMetricDataFromMap(): EdgeMetricData[] {
	const metricData: EdgeMetricData[] = []

	nodeEdgeMetricsMap.set(EdgeMetricDataService.NONE_METRIC, new Map())

	nodeEdgeMetricsMap.forEach((occurences: EdgeMetricCountMap, edgeMetric: string) => {
		let maximumMetricValue = 0
		occurences.forEach((value: EdgeMetricCount) => {
			const combinedValue = value.incoming + value.outgoing
			if (combinedValue > maximumMetricValue) {
				maximumMetricValue = combinedValue
			}
		})
		metricData.push({ name: edgeMetric, maxValue: maximumMetricValue })
	})

	return metricData
}
