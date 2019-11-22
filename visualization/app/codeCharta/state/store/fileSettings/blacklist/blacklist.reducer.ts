import _ from "lodash"
import { BlacklistItem } from "../../../../codeCharta.model"
import { BlacklistAction, BlacklistActions } from "./blacklist.actions"
import angular from "angular"

export function blacklist(state: BlacklistItem[] = [], action: BlacklistAction): BlacklistItem[] {
	switch (action.type) {
		case BlacklistActions.ADD_BLACKLIST_ITEM:
			return [...state, action.payload]
		case BlacklistActions.REMOVE_BLACKLIST_ITEM:
			return removeBlacklistItem(state, action.payload)
		case BlacklistActions.LOAD_BLACKLIST:
			return [...action.payload]
		default:
			return state
	}
}

function removeBlacklistItem(blacklist: BlacklistItem[], item: BlacklistItem): BlacklistItem[] {
	return blacklist.filter(x => {
		return JSON.stringify(angular.toJson(x)) !== JSON.stringify(angular.toJson(item))
	})
}
