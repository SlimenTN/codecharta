import {DataService} from "../../core/data/data.service";
import {Settings, SettingsService, SettingsServiceSubscriber} from "../../core/settings/settings.service";
import "./rangeSlider.component.scss";
import {MapColors} from "../codeMap/rendering/renderSettings";
import $ from "jquery";

export class RangeSliderController implements SettingsServiceSubscriber {

    public sliderOptions: any;
    private maxMetricValue: number;

    /* @ngInject */
    constructor(private settingsService: SettingsService,
                private dataService: DataService,
                $timeout,
                $scope) {
        this.settingsService.subscribe(this);
        this.initSliderOptions();

        $timeout(function() {
            $scope.$broadcast('rzSliderForceRender')
        })

    }

    onSettingsChanged(settings: Settings) {
        this.initSliderOptions(settings);
        this.updateSliderColors();
    }

    initSliderOptions(settings: Settings = this.settingsService.settings) {
        this.maxMetricValue = this.dataService.getMaxMetricInAllRevisions(settings.colorMetric);

        this.sliderOptions = {
            ceil: this.maxMetricValue,
            onChange: this.onSliderChange.bind(this),
            pushRange: true,
            onToChange: this.onToSliderChange.bind(this),
            onFromChange: this.onFromSliderChange.bind(this)
        };
    }

    private onToSliderChange() {
        this.settingsService.settings.neutralColorRange.to = Math.max(1,
            this.settingsService.settings.neutralColorRange.to );
        this.settingsService.settings.neutralColorRange.to = Math.min (
            this.dataService.getMaxMetricInAllRevisions(this.settingsService.settings.colorMetric),
            this.settingsService.settings.neutralColorRange.to );
        this.settingsService.settings.neutralColorRange.from = Math.min(
            this.settingsService.settings.neutralColorRange.to-1, this.settingsService.settings.neutralColorRange.from);
        this.onSliderChange();
    }

    private onFromSliderChange() {
        this.settingsService.settings.neutralColorRange.from = Math.min(
            this.dataService.getMaxMetricInAllRevisions(this.settingsService.settings.colorMetric)-1,
            this.settingsService.settings.neutralColorRange.from );
        this.settingsService.settings.neutralColorRange.to = Math.max(
            this.settingsService.settings.neutralColorRange.to, this.settingsService.settings.neutralColorRange.from+1);
        this.onSliderChange();
    }

    private onSliderChange() {
        this.settingsService.applySettings();
    }

    private updateSliderColors() {
        const s = this.settingsService.settings;
        const rangeFromPercentage = 100 / this.maxMetricValue * s.neutralColorRange.from;
        let mapColorPositive = s.whiteColorBuildings ? MapColors.positiveWhite : MapColors.positive;

        let rangeColors = {
            left: s.neutralColorRange.flipped ? MapColors.negative : mapColorPositive,
            middle: MapColors.neutral,
            right: s.neutralColorRange.flipped ? mapColorPositive : MapColors.negative
        };

        rangeColors = this.updateWhiteColorsToGreyToMakeItVisible(rangeColors);
        this.applyCssSettings(rangeColors, rangeFromPercentage);
    }

    private updateWhiteColorsToGreyToMakeItVisible(rangeColors) {
        for(let property of Object.keys(rangeColors)) {
            if (rangeColors[property] == 0xFFFFFF) {
                rangeColors[property] = 0xDDDDDD;
            }
        }
        return rangeColors;
    }

    private applyCssSettings(rangeColors, rangeFromPercentage) {
        const slider = $("range-slider-component .rzslider");
        const leftSection = slider.find(".rz-bar-wrapper:nth-child(3) .rz-bar");
        const middleSection = slider.find(".rz-selection");
        const rightSection = slider.find(".rz-right-out-selection .rz-bar");

        leftSection.css("cssText", "background: #" + rangeColors.left.toString(16) + " !important; width: " + rangeFromPercentage + "%;");
        middleSection.css("cssText", "background: #" + rangeColors.middle.toString(16) + " !important;");
        rightSection.css("cssText", "background: #" + rangeColors.right.toString(16) + ";");
    }

}

export const rangeSliderComponent = {
    selector: "rangeSliderComponent",
    template: require("./rangeSlider.component.html"),
    controller: RangeSliderController
};




