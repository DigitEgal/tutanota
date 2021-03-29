// @flow
import o from "ospec"

import {parseCsv} from "../../../src/misc/parsing/csv"

o.spec("Parser combinator test", function () {})

o.spec("CSV parsing test", function () {
	o("Parse good csv no quotes no empty columns and some nonstandard characters", function () {
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

	o("Parse good csv with quotes", function () {
		const csv = `  foo  ,"bar\nrab", baz ,"quux"\n  """Ogres are like onions"" - shrek"  , fiona,"donkey", "farquaad\n\n"\nphoebe, joey, rachael, "monica, richard",chandler\n`
		const actual = parseCsv(csv).rows
		const expected = [
			["foo", "bar\nrab", "baz", "quux\n\n"],
			[`"Ogres are like onions" - shrek`, "fiona", "donkey", "farquaad"],
			["phoebe", "joey", "rachael", "monica, richard", "chandler"],
		]
		o(actual).deepEquals(expected)
	})
})