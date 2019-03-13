import {Node} from "../rendering/node";
import * as d3 from "d3";
import {hierarchy, HierarchyNode} from "d3";
import {TreeMapUtils} from "./treemap.util";
import {CodeMapUtilService} from "../codeMap.util.service";
import {CodeMapNode, BlacklistType, CCFile, Settings, FileState, MetricData} from "../../../codeCharta.model";
import { MetricStateService } from "../../../state/metricState.service";

export interface SquarifiedValuedCodeMapNode {
    data: CodeMapNode;
    children?: SquarifiedValuedCodeMapNode[];
    parent?: SquarifiedValuedCodeMapNode;
    value: number;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

export class TreeMapService {

    private static HEIGHT_DIVISOR = 1;
    private static FOLDER_HEIGHT = 2;
    private static MIN_BUILDING_HEIGHT = 2;
    private static HEIGHT_VALUE_WHEN_METRIC_NOT_FOUND = 0;
    private static PADDING_SCALING_FACTOR = 0.4;

    /* @ngInject */
    constructor() {}

    public createTreemapNodes(renderFile: CCFile, s: Settings, metricData: MetricData[]): Node {
        const squaredNode: SquarifiedValuedCodeMapNode = this.squarify(renderFile, s);
        return this.addMapScaledHeightDimensionAndFinalizeFromRoot(squaredNode, s, metricData);
    }

    public setVisibilityOfNodeAndDescendants(node: CodeMapNode, visibility: boolean) {
        node.visible = visibility;
        hierarchy<CodeMapNode>(node).descendants().forEach((hierarchyNode) => {
            hierarchyNode.data.visible = visibility;
        });
        return node;
    }

    private squarify(renderFile: CCFile, s: Settings): SquarifiedValuedCodeMapNode {
        let nodes: HierarchyNode<CodeMapNode> = d3.hierarchy<CodeMapNode>(renderFile.map);
        const blacklisted = CodeMapUtilService.numberOfBlacklistedNodes(nodes.descendants().map(d => d.data), s.fileSettings.blacklist);
        let nodesPerSide = 2 * Math.sqrt(nodes.descendants().length - blacklisted);
        let treeMap = d3.treemap<CodeMapNode>()
            .size([s.treeMapSettings.mapSize + nodesPerSide * s.dynamicSettings.margin, s.treeMapSettings.mapSize + nodesPerSide * s.dynamicSettings.margin])
            .paddingOuter(s.dynamicSettings.margin * TreeMapService.PADDING_SCALING_FACTOR || 1)
            .paddingInner(s.dynamicSettings.margin * TreeMapService.PADDING_SCALING_FACTOR || 1);

        return treeMap(nodes.sum((node) => this.calculateValue(node, s, renderFile.fileMeta.fileName))) as SquarifiedValuedCodeMapNode;
    }

    private addMapScaledHeightDimensionAndFinalizeFromRoot(squaredNode: SquarifiedValuedCodeMapNode, s: Settings, metricData: MetricData[]): Node {
        const maxHeight = metricData.find(x => x.name == s.dynamicSettings.heightMetric).maxValue;
        const heightScale = s.treeMapSettings.mapSize / TreeMapService.HEIGHT_DIVISOR / maxHeight;
        return this.addHeightDimensionAndFinalize(squaredNode, s, heightScale, maxHeight);
    }

    private addHeightDimensionAndFinalize(squaredNode: SquarifiedValuedCodeMapNode, s: Settings, heightScale: number, maxHeight: number, depth = 0, parent: Node = null): Node {

        let attr = squaredNode.data.attributes || {};
        let heightValue = attr[s.dynamicSettings.heightMetric];

        if (heightValue === undefined || heightValue === null) {
            heightValue = TreeMapService.HEIGHT_VALUE_WHEN_METRIC_NOT_FOUND;
        }

        if (CodeMapUtilService.isBlacklisted(squaredNode.data, s.fileSettings.blacklist, BlacklistType.hide)) {
            squaredNode.data = this.setVisibilityOfNodeAndDescendants(squaredNode.data, false);
        }

        const finalNode = TreeMapUtils.buildNodeFrom(squaredNode, heightScale, heightValue, maxHeight, depth, parent, s, TreeMapService.MIN_BUILDING_HEIGHT, TreeMapService.FOLDER_HEIGHT);

        if (squaredNode.children && squaredNode.children.length > 0) {
            const finalChildren: Node[] = [];
            for (let i = 0; i < squaredNode.children.length; i++) {
                finalChildren.push(this.addHeightDimensionAndFinalize(squaredNode.children[i], s, heightScale, maxHeight, depth + 1, finalNode));
            }
            finalNode.children = finalChildren;
        }
        return finalNode;

    }

    // TODO: isDeletedNodeFromComparisonMap necessary? filename needed..
    private isDeletedNodeFromComparisonMap(node: CodeMapNode, s: Settings, fileName: string): boolean {
        return node &&
                node.deltas &&
                node.origin !== fileName &&
                node.deltas[s.dynamicSettings.heightMetric] < 0 &&
                node.attributes[s.dynamicSettings.areaMetric] === 0;
    }


    private calculateValue(node: CodeMapNode, s: Settings, fileName: string): number {

        let result = 0;

        if(CodeMapUtilService.isBlacklisted(node, s.fileSettings.blacklist, BlacklistType.exclude)) {
            return 0;
        }

        if(this.isDeletedNodeFromComparisonMap(node, s, fileName)) {
            return Math.abs(node.deltas[s.dynamicSettings.areaMetric]);
        }

        if ((!node.children || node.children.length === 0)) {
            if(node.attributes && node.attributes[s.dynamicSettings.areaMetric]) {
                result = node.attributes[s.dynamicSettings.areaMetric] || 0;
            } else {
                result = this.getEdgeValue(node, s);
            }
        }
        return result;
    }

    private getEdgeValue(node: CodeMapNode, s: Settings) {
        let filteredEdgeAttributes: number[] = [];

        if (s.fileSettings.edges) {
            s.fileSettings.edges.forEach((edge)=> {
                if (edge.fromNodeName == node.path || edge.toNodeName == node.path) {
                    filteredEdgeAttributes.push(edge.attributes[s.dynamicSettings.areaMetric]);
                }
            });
        }

        if (filteredEdgeAttributes) {
            return filteredEdgeAttributes.sort().reverse()[0];
        }
        return 1;
    }
}

