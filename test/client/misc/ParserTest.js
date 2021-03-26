// @flow
import o from "ospec"

import {parseCsv} from "../../../src/misc/parsing/csv"

o.spec("Parser combinator test", function () {})

o.spec("CSV parsing test", function () {
	o("Parse good csv no quotes no empty columns", function () {
		const csv = "foo,bar, baz ,quux \nshrek and fiona,donkey, farquaad\nphoebe, joey, rachael,monica,chandler\n£,%$8y,🗒 🎆👇 🕡📜 "
		const actual = parseCsv(csv).rows
		const expected = [
			["foo", "bar", "baz", "quux"],
			["shrek and fiona", "donkey", "farquaad"],
			["phoebe", "joey", "rachael", "monica", "chandler"],
			["£", "%$8y", "🗒 🎆👇 🕡📜"]
		]
		o(actual).deepEquals(expected)
	})
})