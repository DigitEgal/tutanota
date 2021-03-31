// @flow

import m from "mithril"
import type {NavButtonAttrs} from "../gui/base/NavButtonN"
import {isNavButtonSelected, NavButtonN} from "../gui/base/NavButtonN"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {ButtonN} from "../gui/base/ButtonN"

export type SettingsFolderRowAttrs = {
	mainButtonAttrs: NavButtonAttrs,
	extraButtonAttrs?: ?ButtonAttrs,
}

export class SettingsFolderRow implements MComponent<SettingsFolderRowAttrs> {

	view(vnode: Vnode<SettingsFolderRowAttrs>): Children {
		const {mainButtonAttrs, extraButtonAttrs} = vnode.attrs
		const selector = `.folder-row.flex-start.pl-l.pr-m${isNavButtonSelected(mainButtonAttrs) ? ".row-selected" : ""}`
		return m(selector, [
			[
				m(NavButtonN, mainButtonAttrs),
				extraButtonAttrs ? m(ButtonN, extraButtonAttrs) : null,
			],
		])
	}
}

