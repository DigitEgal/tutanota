// @flow

import m from "mithril"
import type {TranslationKey} from "../misc/LanguageViewModel"
import {lang} from "../misc/LanguageViewModel"
import {theme} from "./theme"
import type {ButtonAttrs} from "./base/ButtonN"
import {ButtonN} from "./base/ButtonN"

export type SidebarSectionAttrs = {
	name: TranslationKey | lazy<string>,
	buttonAttrs?: ?ButtonAttrs,
	isSubsection?: ?boolean,
}

export class SidebarSection implements MComponent<SidebarSectionAttrs> {
	view(vnode: Vnode<SidebarSectionAttrs>): Children {
		const {name, buttonAttrs, isSubsection: _isSubsection} = vnode.attrs
		// default is false
		const isSubsection = _isSubsection === true
		const content = vnode.children
		return m(isSubsection ? ".subsection" : "", {style: {color: theme.navigation_button}}, [
			m(".folder-row.flex-space-between.plr-l.pt-s" + (isSubsection ? "" : ".button-height"), [
				m("small.b.align-self-center.ml-negative-xs" + (isSubsection ? ".relatively-smaller" : ""),
					lang.getMaybeLazy(name).toLocaleUpperCase()),
				buttonAttrs ? m(ButtonN, buttonAttrs) : null
			]),
			content
		])
	}
}