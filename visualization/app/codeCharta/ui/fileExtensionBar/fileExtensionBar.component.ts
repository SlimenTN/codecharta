import "./fileExtensionBar.component.scss"
import { SettingsService } from "../../state/settings.service"
import { ExtensionAttribute, FileExtensionCalculator, MetricDistributionPair } from "../../util/fileExtensionCalculator"
import { CCFile, CodeMapNode, DynamicSettings } from "../../codeCharta.model"
import { CodeMapPreRenderService, CodeMapPreRenderServiceSubscriber } from "../codeMap/codeMap.preRender.service"
import { IRootScopeService } from "angular"

export class FileExtensionBarController implements CodeMapPreRenderServiceSubscriber {
	private _viewModel: {
		distribution: ExtensionAttribute[]
	} = {
		distribution: []
	}

	/* @ngInject */
	constructor(private $rootScope: IRootScopeService, private settingsService: SettingsService) {
		CodeMapPreRenderService.subscribe(this.$rootScope, this)
	}

	public onRenderFileChanged(renderFile: CCFile, event: angular.IAngularEvent) {
		this.updateFileExtensionBar(renderFile.map)
	}

	public updateFileExtensionBar(map: CodeMapNode) {
		const s: DynamicSettings = this.settingsService.getSettings().dynamicSettings
		const metrics: string[] = [s.areaMetric]
		const distribution: MetricDistributionPair = FileExtensionCalculator.getRelativeFileExtensionDistribution(map, metrics)
		const otherExtension: ExtensionAttribute = {
			fileExtension: "other",
			absoluteMetricValue: null,
			relativeMetricValue: 0,
			color: "#676867"
		}
		const result: ExtensionAttribute[] = []
		const array: ExtensionAttribute[] = []
		distribution[s.areaMetric].forEach(x => {
			if (x.relativeMetricValue < 5) {
				array.push(x)
			} else {
				x.color = this.numberToHsl(this.hashCode(x.fileExtension))
				result.push(x)
			}
		})
		array.forEach(x => (otherExtension.relativeMetricValue += x.relativeMetricValue))
		result.push(otherExtension)
		this._viewModel.distribution = result
	}

	private hashCode(str): number {
		let hash: number = 0
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash)
		}
		return hash
	}

	private numberToHsl(hashCode: number): string {
		let shortened = hashCode % 360
		return "hsla(" + shortened + ", 40%, 50%)"
	}
}

export const fileExtensionBarComponent = {
	selector: "fileExtensionBarComponent",
	template: require("./fileExtensionBar.component.html"),
	controller: FileExtensionBarController
}
