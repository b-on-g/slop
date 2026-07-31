namespace $.$$ {

	const TIER_LABELS: Record< $bog_slop_metrics_tier, string > = {
		human: 'человек',
		mixed: 'пополам',
		ai: 'нейросеть',
	}

	export class $bog_slop extends $.$bog_slop {

		@ $mol_mem
		override popup() {
			const loc = $mol_dom_context.location
			if( !loc ) return false
			if( /extension:$/.test( loc.protocol ) ) return true
			return /[?#&]popup\b/.test( loc.href )
		}

		@ $mol_mem
		verdict() {
			return $bog_slop_metrics( this.text() )
		}

		filled() {
			return this.text().trim().length > 0
		}

		@ $mol_mem
		override report() {
			if( !this.filled() ) return [ this.Empty() ]
			return [ this.Verdict(), this.Metrics(), this.Note() ]
		}

		override tier() {
			return this.verdict().tier
		}

		override index_label() {
			return this.verdict().final.toFixed( 2 )
		}

		override tier_label() {
			return TIER_LABELS[ this.verdict().tier ]
		}

		override paras_label() {
			return `Абзацев: ${ this.verdict().paras }`
		}

		override metric_rows() {
			return $bog_slop_metrics_ids.map( id => this.Metric( id ) )
		}

		override metric_title( id: string ) {
			return $bog_slop_metrics_titles[ id ] ?? id
		}

		override metric_value( id: string ) {
			return this.metric_portion( id ).toFixed( 2 )
		}

		override metric_portion( id: string ) {
			return this.verdict().scores[ id ] ?? 0
		}

	}

}
