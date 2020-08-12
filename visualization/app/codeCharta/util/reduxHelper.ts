import _ from "lodash"

const clone = require("rfdc")()

export function removeItemFromArray(array: any[], item: any): any[] {
	if (item) {
		return array.filter(x => !_.isEqual(x, item))
	}
	return array
}

export function addItemToArray(array: any[], item: any): any[] {
	if (!arrayContainsItem(array, item)) {
		const copy = [...array]
		copy.push(clone(item))
		return copy
	}
	return array
}

export function isActionOfType(actionType: string, actions) {
	return actions[actionType] !== undefined
}

function arrayContainsItem(array: any[], item: any): boolean {
	return array.some(x => _.isEqual(x, item))
}
