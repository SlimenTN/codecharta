"use strict"

import "./scenarioDropDown.component.scss"
import { ScenarioHelper, Scenario } from "../../util/scenarioHelper"
import { MetricService, MetricServiceSubscriber } from "../../state/metric.service"
import { MetricData } from "../../codeCharta.model"
import { IRootScopeService } from "angular"
import { ThreeOrbitControlsService } from "../codeMap/threeViewer/threeOrbitControlsService"
import { StoreService } from "../../state/store.service"
import { setState } from "../../state/store/state.actions"
import { DialogService } from "../dialog/dialog.service"

export class ScenarioDropDownController implements MetricServiceSubscriber {
	private _viewModel: {
		scenarios: Scenario[]
	} = {
		scenarios: null
	}

	private availableMetrics: MetricData[]

	constructor(
		private $rootScope: IRootScopeService,
		private storeService: StoreService,
		private dialogService: DialogService,
		private threeOrbitControlsService: ThreeOrbitControlsService
	) {
		MetricService.subscribe(this.$rootScope, this)
	}

	public onMetricDataAdded(metricData: MetricData[]) {
		this._viewModel.scenarios = ScenarioHelper.getScenarios(metricData)
		this.availableMetrics = metricData
	}

	public applyScenario(scenarioName: string) {
		if (this.isScenarioAppliable(ScenarioHelper.getScenarioSettingsByName(scenarioName).dynamicSettings)) {
			this.storeService.dispatch(setState(ScenarioHelper.getScenarioSettingsByName(scenarioName)))
			this.threeOrbitControlsService.autoFitTo()
		} else {
			this.dialogService.showErrorDialog("This metric is not appliable, because not all metrics are available for this map.")
		}
	}

	private isScenarioAppliable(scenario) {
		for (let attribute in scenario) {
			if (this.isMetricNotAvailable(scenario[attribute]) === true && scenario[attribute] !== "None") {
				return false
			}
		}
		return true
	}

	private isMetricNotAvailable(metricName: string) {
		return !this.availableMetrics.find(x => x.name == metricName)
	}

	public getVisibility(icon: String, scenarioName: string) {
		const lightGray = "#d3d3d3"
		// TODO: Function to Check if attributes are within the Scenario

		switch (icon) {
			case "view": {
				// TODO: Still Implement if perspective is saved within the scenario
				if (!this._viewModel.scenarios.find(scenario => scenario.name === scenarioName).settings.appSettings.camera) {
					return lightGray
				}
				break
			}
			case "area": {
				if (!this._viewModel.scenarios.find(scenario => scenario.name === scenarioName).settings.dynamicSettings.areaMetric) {
					return lightGray
				}
				break
			}
			case "color": {
				if (!this._viewModel.scenarios.find(scenario => scenario.name === scenarioName).settings.dynamicSettings.colorMetric) {
					return lightGray
				}
				break
			}
			case "height": {
				if (!this._viewModel.scenarios.find(scenario => scenario.name === scenarioName).settings.dynamicSettings.heightMetric) {
					return lightGray
				}
				break
			}
			case "edges": {
				if (!this._viewModel.scenarios.find(scenario => scenario.name === scenarioName).settings.dynamicSettings.edgeMetric) {
					return lightGray
				}
				break
			}
			default:
				return ""
		}
	}

	public showAddScenarioSettings() {
		// TODO: show Scenario Save Settings
		this.dialogService.showAddScenarioSettings()
		//ScenarioHelper.addScenario()
	}

	public removeScenario(scenarioName) {
		//TODO: Delete Scenario - Get a better attribute than name for excluding
		ScenarioHelper.deleteScenario(scenarioName)
	}
}

export const scenarioDropDownComponent = {
	selector: "scenarioDropDownComponent",
	template: require("./scenarioDropDown.component.html"),
	controller: ScenarioDropDownController
}
