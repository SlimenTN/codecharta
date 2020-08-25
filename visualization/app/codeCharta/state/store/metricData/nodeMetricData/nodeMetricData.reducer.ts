import { NodeMetricDataAction, NodeMetricDataActions, setNodeMetricData } from "./nodeMetricData.actions"
import { BlacklistItem, BlacklistType, CodeMapNode, NodeMetricData } from "../../../../codeCharta.model"
import { getVisibleFileStates } from "../../../../model/files/files.helper"
import { FileState } from "../../../../model/files/files"
import { CodeMapHelper } from "../../../../util/codeMapHelper"
import { hierarchy, HierarchyNode } from "d3"
import { NodeMetricDataService } from "./nodeMetricData.service"
import { sortByMetricName } from "../metricData.reducer"

const clone = require("rfdc")()

export function nodeMetricData(state: NodeMetricData[] = setNodeMetricData().payload, action: NodeMetricDataAction): NodeMetricData[] {
	switch (action.type) {
		case NodeMetricDataActions.SET_NODE_METRIC_DATA:
			return clone(action.payload)
		case NodeMetricDataActions.CALCULATE_NEW_NODE_METRIC_DATA:
			return setNewMetricData(action.payload.fileStates, action.payload.blacklist)
		default:
			return state
	}
}

function setNewMetricData(fileStates: FileState[], blacklist: BlacklistItem[]): NodeMetricData[] {
	const hashMap: Map<string, number> = new Map()

	getVisibleFileStates(fileStates).forEach((fileState: FileState) => {
		const nodes: HierarchyNode<CodeMapNode>[] = hierarchy(fileState.file.map).leaves()
		nodes.forEach((node: HierarchyNode<CodeMapNode>) => {
			if (node.data.path && !CodeMapHelper.isPathBlacklisted(node.data.path, blacklist, BlacklistType.exclude)) {
				addMaxMetricValuesToHashMap(node, hashMap)
			}
		})
	})
	return getMetricDataFromHashMap(hashMap)
}

function addMaxMetricValuesToHashMap(node: HierarchyNode<CodeMapNode>, hashMap: Map<string, number>) {
	const attributes: string[] = Object.keys(node.data.attributes)
	attributes.forEach((metric: string) => {
		const maxValue = hashMap.get(metric)

		if (maxValue === undefined || maxValue <= node.data.attributes[metric]) {
			hashMap.set(metric, node.data.attributes[metric])
		}
	})
}

function getMetricDataFromHashMap(hashMap: Map<string, number>): NodeMetricData[] {
	const metricData: NodeMetricData[] = []

	hashMap.set(NodeMetricDataService.UNARY_METRIC, 1)

	hashMap.forEach((value: number, key: string) => {
		metricData.push({
			name: key,
			maxValue: value
		})
	})
	return sortByMetricName(metricData)
}
