namespace $ {

	$mol_test({

		'jev marks only prose paragraphs by answers'( $ ) {

			const asked = [] as string[]

			const jev = $bog_slop_jev.make({
				$,
				request: ( state: Record< string, string >, questions: Record< string, object > )=> {
					asked.push( ... Object.keys( state ) )
					return { answers: {
						'0_antithesis': { noul: .9 },
						'0_aphorism': { noul: .2 },
						'0_concreteness': { score: 1.7 },
					} }
				},
			})

			const reply = jev.semantics([
				'Дело вовсе не в скорости сборки, а в том, куда именно ты с ней бежишь.',
				'Такие дела.',
			])

			$mol_assert_equal( asked, [ 'p0' ] )
			$mol_assert_equal( reply.marks, [
				{ patterns: [ 'antithesis' ], concreteness: 2 },
				{ patterns: [], concreteness: null },
			] )

		},

	})

}
