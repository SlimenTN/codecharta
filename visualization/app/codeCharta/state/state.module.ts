import angular from "angular"
// Plop: Append module import here
import { ColorRangeService } from "./store/dynamicSettings/colorRange/colorRange.service"
import { MarginService } from "./store/dynamicSettings/margin/margin.service"
import { SearchPatternService } from "./store/dynamicSettings/searchPattern/searchPattern.service"
import { SearchedNodePathsService } from "./store/dynamicSettings/searchedNodePaths/searchedNodePaths.service"
import { FocusedNodePathService } from "./store/dynamicSettings/focusedNodePath/focusedNodePath.service"
import { HeightMetricService } from "./store/dynamicSettings/heightMetric/heightMetric.service"
import { DistributionMetricService } from "./store/dynamicSettings/distributionMetric/distributionMetric.service"
import { ColorMetricService } from "./store/dynamicSettings/colorMetric/colorMetric.service"
import { AreaMetricService } from "./store/dynamicSettings/areaMetric/areaMetric.service"
import { BlacklistService } from "./store/fileSettings/blacklist/blacklist.service"
import { InjectorService } from "./injector.service"
import { StoreService } from "./store.service"
import { EdgeMetricDataService } from "./edgeMetricData.service"
import { SearchPanelService } from "./searchPanel.service"
import { NodeSearchService } from "./nodeSearch.service"
import { FileStateService } from "./fileState.service"
import { SettingsService } from "./settingsService/settings.service"
import { MetricService } from "./metric.service"
import { LoadingStatusService } from "./loadingStatus.service"
import "../codeCharta.module"
import _ from "lodash"
import { IsPresentationModeService } from "./store/appSettings/isPresentationMode/isPresentationMode.service"

angular
	.module("app.codeCharta.state", ["app.codeCharta"])
	// Plop: Append service name here
	.service(_.camelCase(ColorRangeService.name), ColorRangeService)
	.service(_.camelCase(MarginService.name), MarginService)
	.service(_.camelCase(SearchPatternService.name), SearchPatternService)
	.service(_.camelCase(SearchedNodePathsService.name), SearchedNodePathsService)
	.service(_.camelCase(FocusedNodePathService.name), FocusedNodePathService)
	.service(_.camelCase(HeightMetricService.name), HeightMetricService)
	.service(_.camelCase(DistributionMetricService.name), DistributionMetricService)
	.service(_.camelCase(ColorMetricService.name), ColorMetricService)
	.service(_.camelCase(AreaMetricService.name), AreaMetricService)
	.service(_.camelCase(IsPresentationModeService.name), IsPresentationModeService)
	.service(_.camelCase(BlacklistService.name), BlacklistService)
	.service(_.camelCase(InjectorService.name), InjectorService)
	.service(_.camelCase(StoreService.name), StoreService)
	.service(_.camelCase(EdgeMetricDataService.name), EdgeMetricDataService)
	.service(_.camelCase(SearchPanelService.name), SearchPanelService)
	.service(_.camelCase(NodeSearchService.name), NodeSearchService)
	.service(_.camelCase(FileStateService.name), FileStateService)
	.service(_.camelCase(SettingsService.name), SettingsService)
	.service(_.camelCase(MetricService.name), MetricService)
	.service(_.camelCase(LoadingStatusService.name), LoadingStatusService)
