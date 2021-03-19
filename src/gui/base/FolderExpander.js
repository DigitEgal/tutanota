// @flow

import m from "mithril"
import type {TranslationKey} from "../../misc/LanguageViewModel"
import {ExpanderButtonN, ExpanderPanelN} from "./Expander"
import {theme} from "../theme"
import type {ButtonAttrs} from "./ButtonN"
import {ButtonN} from "./ButtonN"

export type FolderExpanderAttrs = {
	label: TranslationKey | lazy<string>,
	expanded: Stream<boolean>,
	extraButton?: ButtonAttrs
}

export class FolderExpander implements MComponent<FolderExpanderAttrs> {
	view(vnode: Vnode<FolderExpanderAttrs>): Children {
		return m(".folder-expander", [
			m(".plr-l.flex", [
				m(ExpanderButtonN, {
					label: vnode.attrs.label,
					expanded: vnode.attrs.expanded,
					color: theme.navigation_button
				}),
				vnode.attrs.extraButton
					? m(".pl-xl.pt-s", m(ButtonN, vnode.attrs.extraButton))
					: null
			]),
			m(ExpanderPanelN, {
				expanded: vnode.attrs.expanded
			}, vnode.children)
		])
	}
}