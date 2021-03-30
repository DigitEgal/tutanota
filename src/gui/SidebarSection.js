// @flow

import m from "mithril"
import type {TranslationKey} from "../misc/LanguageViewModel"
import {lang} from "../misc/LanguageViewModel"
import type {ButtonAttrs} from "./base/ButtonN"
import {ButtonN} from "./base/ButtonN"
import {theme} from "./theme"

export type SidebarSectionAttrs = {
	label: TranslationKey | lazy<string>,
	buttonAttrs?: ?ButtonAttrs
}

export class SidebarSection implements MComponent<SidebarSectionAttrs> {
	constructor(vnode: Vnode<SidebarSectionAttrs>) {

	}

	view(vnode: Vnode<SidebarSectionAttrs>): Children {
		const {label, buttonAttrs} = vnode.attrs
		const content = vnode.children
		return m(".folders", {style: {color: theme.navigation_button}}, [
			m(".folder-row.flex-space-between.button-height.plr-l", [
				m("small.b.align-self-center.ml-negative-xs",
					lang.getMaybeLazy(label).toLocaleUpperCase()),
				buttonAttrs ? m(ButtonN, buttonAttrs) : null
			]),
			content
		])
	}
}