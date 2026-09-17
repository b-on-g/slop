namespace $ {

	const PATTERNS: Record< typeof $bog_slop_metrics_ids_llm[ number ], string > = {
		antithesis: `use a rhetorical contrast like "не X, а Y" / "дело не в X, а в Y" as a dramatic device rather than out of real necessity`,
		aphorism: `end with a short quotable punchline that wraps it up like an aphorism`,
		vague_attribution: `appeal to a generic authority ("исследования показывают", "играет ключевую роль", "стало поворотным моментом") without a concrete name, source or number`,
		pseudo_sincerity: `try to win the reader over with assurances of honesty ("честно говоря", "без воды", "давайте будем честны", "спойлер")`,
	}

	const CONCRETENESS = [
		'Only generic vague wording without a single fact, number or name',
		'Mixed text',
		'Dense specifics: numbers, dates, names, exact examples',
	]

	type Answer = {
		noul?: number
		score?: number
	}

	export class $bog_slop_jev extends $mol_object {

		uri() { return 'https://tube.87.120.36.150.ip.giper.dev/typesafe' }

		batch() { return 6 }

		threshold() { return .5 }

		questions( index: number ) {

			const path = '`p' + index + '`'
			const questions: Record< string, object > = {}

			for( const id of $bog_slop_metrics_ids_llm ) {
				questions[ `${ index }_${ id }` ] = {
					type: 'noul',
					instructions: `Does the Russian paragraph in ${ path } ${ PATTERNS[ id ] }?`,
				}
			}

			questions[ `${ index }_concreteness` ] = {
				type: 'score',
				instructions: `How dense is concrete detail in the Russian paragraph in ${ path }?`,
				criteria: CONCRETENESS,
			}

			return questions
		}

		request( state: Record< string, string >, questions: Record< string, object > ) {
			return this.$.$mol_fetch.json( this.uri(), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ model: 'jev-latest', state, questions }),
			} ) as { answers?: Record< string, Answer > }
		}

		@ $mol_action
		semantics( paras: readonly string[] ) {

			const marks = paras.map( ()=> ({
				patterns: [] as string[],
				concreteness: null as number | null,
			}) )

			const eligible = [] as number[]
			paras.forEach( ( para, index )=> {
				if( $bog_slop_metrics_prose( para ) ) eligible.push( index )
			} )

			const size = this.batch()

			for( let start = 0; start < eligible.length; start += size ) {

				const batch = eligible.slice( start, start + size )

				const state: Record< string, string > = {}
				const questions: Record< string, object > = {}

				for( const index of batch ) {
					state[ 'p' + index ] = paras[ index ]
					Object.assign( questions, this.questions( index ) )
				}

				const answers = this.request( state, questions ).answers ?? {}

				for( const index of batch ) {

					const level = answers[ `${ index }_concreteness` ]?.score

					marks[ index ] = {
						patterns: $bog_slop_metrics_ids_llm.filter(
							id => ( answers[ `${ index }_${ id }` ]?.noul ?? 0 ) > this.threshold()
						),
						concreteness: typeof level === 'number' ? Math.round( level ) : null,
					}

				}

			}

			return {
				marks: marks as readonly $bog_slop_metrics_semantics[],
				name: 'jev',
			}
		}

	}

}
