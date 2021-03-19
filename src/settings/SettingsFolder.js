// @flow
import {assertMainOrNode} from "../api/common/Env"
import type {lazyIcon} from "../gui/base/Icon"
import type {TranslationKey} from "../misc/LanguageViewModel"
import {isSelectedPrefix} from "../gui/base/NavButtonN"

assertMainOrNode()

export class SettingsFolder {
	name: TranslationKey | lazy<string>;
	icon: lazyIcon;
	path: string;
	url: string; // can be changed from outside
	viewerCreator: lazy<UpdatableSettingsViewer>;
	_isVisibleHandler: lazy<boolean>;

	constructor(name: TranslationKey | lazy<string>, icon: lazyIcon, path: string, viewerCreator: lazy<UpdatableSettingsViewer>) {
		this.name = name
		this.icon = icon
		this.path = path
		this.url = `/settings/${path}`
		this.viewerCreator = viewerCreator
		this._isVisibleHandler = () => true
	}

	isActive(): boolean {
		return isSelectedPrefix(this.url)
	}

	isVisible(): boolean {
		return this._isVisibleHandler()
	}

	setIsVisibleHandler(isVisibleHandler: lazy<boolean>): SettingsFolder {
		this._isVisibleHandler = isVisibleHandler
		return this
	}
}
