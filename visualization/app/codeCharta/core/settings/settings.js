"use strict";

import "../url/url.js";
import "../data/data.js";

import {SettingsService} from "./settingsService.js";

angular.module(
    "app.codeCharta.core.settings",
    ["app.codeCharta.core.url", "app.codeCharta.core.data", "app.codeCharta.core.statistic"]
);

angular.module("app.codeCharta.core.settings").service(
    "settingsService", SettingsService
);

