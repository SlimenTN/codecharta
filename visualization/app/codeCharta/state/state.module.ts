// Plop: Append module import here
import angular from "angular";
import {FileStateService} from "./fileState.service";
import {SettingsService} from "./settings.service";
import {MetricStateService} from "./metricState.service";
import {ScenarioService} from "./scenario.service";

angular.module(
    "app.codeCharta.state", []
).service(
    "fileStateService", FileStateService
).service(
    "settingsService", SettingsService
).service(
    "metricStateService", MetricStateService
).service(
    "scenarioService", ScenarioService
);
