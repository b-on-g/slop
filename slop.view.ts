namespace $.$$ {

	const TIER_LABELS: Record< $bog_slop_metrics_tier, string > = {
		human: 'человек',
		mixed: 'пополам',
		ai: 'нейросеть',
	}

	/** Пауза после последней клавиши, чтобы не гонять модель на каждую букву. */
	const DEBOUNCE = 1500

	/** Разбор от модели вместе со слепком текста, для которого он получен. */
	type Done = {
		slug: string
		marks: readonly $bog_slop_metrics_semantics[] | null
		/** Кто ответил на самом деле: выбранная модель могла упереться в лимит и уступить запасной. */
		name: string
	}

	export class $bog_slop extends $.$bog_slop {

		@ $mol_mem
		override popup() {
			const loc = $mol_dom_context.location
			if( !loc ) return false
			if( /extension:$/.test( loc.protocol ) ) return true
			return /[?#&]popup\b/.test( loc.href )
		}

		// НАСТРОЙКИ

		override llm_on( next?: boolean ) {
			return this.$.$mol_state_local.value< boolean >( 'bog_slop_llm', next ) ?? false
		}

		override llm_model( next?: string ) {
			const name = this.$.$mol_state_local.value< string >( 'bog_slop_model', next )
			// Бесплатные модели на OpenRouter приходят и уходят: забытую в хранилище подменяем живой.
			if( !name || !( name in this.$.$bog_slop_model_names ) ) return this.$.$bog_slop_model_name_default
			return name
		}

		override llm_key( next?: string ) {
			return this.$.$mol_state_local.value< string >( 'bog_slop_key', next ) ?? ''
		}

		override model_dict() {
			return this.$.$bog_slop_model_names
		}

		@ $mol_mem
		override setup() {
			if( !this.llm_on() ) return []
			return [ this.Model(), this.Key(), this.Keys_link() ]
		}

		/** Есть ли чем авторизоваться: свой ключ или зашитый в сборку пул. */
		key_ready() {
			return Boolean( this.llm_key().trim() || this.$.$bog_slop_model_keys.length )
		}

		// РАЗБОР

		/** Абзацы ровно в том виде, в каком их видят метрики. */
		@ $mol_mem
		paras() {
			return $bog_slop_metrics_paras( $bog_slop_metrics_strip( this.text() ) )
		}

		/** Слепок текста и настроек: пока он не меняется, ходить в модель незачем. */
		@ $mol_mem
		slug() {
			if( !this.llm_on() ) return ''
			if( !this.key_ready() ) return ''
			if( !this.paras().length ) return ''
			return [ this.llm_model(), this.llm_key().trim(), this.text() ].join( '\n' )
		}

		@ $mol_mem
		model() {
			return this.$.$bog_slop_model.make({
				name: $mol_const( this.llm_model() ),
				key: $mol_const( this.llm_key().trim() ),
			})
		}

		@ $mol_mem
		done( next?: Done | null ) {
			$mol_wire_solid()
			return next ?? null
		}

		@ $mol_mem
		failed( next?: string ) {
			$mol_wire_solid()
			return next ?? ''
		}

		/**
		 * Волокно, которое ходит в модель за семантикой.
		 * Ключ ячейки — слепок, так что на каждый осевший текст заводится своё волокно.
		 * Промис из ячейки НЕ возвращать: $mol_mem считает промис признаком незавершённого
		 * счёта, ячейка подвисает, а по резолву пересчитывается и шлёт запрос заново — по кругу.
		 */
		@ $mol_mem_key
		task( slug: string ) {
			if( !slug ) return ''
			$mol_wire_async( this ).analyze( slug, this.paras() )
			return slug
		}

		/** Разметка абзацев моделью. Дёргается только через $mol_wire_async, отдельным волокном. */
		analyze( slug: string, paras: readonly string[] ) {

			this.$.$mol_wait_timeout( DEBOUNCE )
			if( $mol_wire_probe( ()=> this.slug() ) !== slug ) return

			this.failed( '' )

			try {
				const reply = this.model().semantics( paras )
				this.done({ slug, marks: reply.marks, name: reply.name })
			} catch( error: any ) {
				if( $mol_promise_like( error ) ) $mol_fail_hidden( error )
				this.done({ slug, marks: null, name: '' })
				if( $mol_fail_log( error ) ) this.failed( error.message )
			}

		}

		/** Разметка, которая относится именно к текущему тексту. Иначе её нет. */
		@ $mol_mem
		marks() {
			const done = this.done()
			if( !done ) return null
			if( done.slug !== this.slug() ) return null
			return done.marks
		}

		busy() {
			const slug = this.slug()
			if( !slug ) return false
			return this.done()?.slug !== slug
		}

		@ $mol_mem
		verdict() {
			return $bog_slop_metrics( this.text(), this.marks() )
		}

		filled() {
			return this.text().trim().length > 0
		}

		// ОТЧЁТ

		@ $mol_mem
		override report() {
			if( !this.filled() ) return [ this.Empty() ]
			return [ this.Verdict(), this.Metrics(), this.Status(), this.Note() ]
		}

		override status_kind() {
			if( !this.llm_on() ) return ''
			if( !this.key_ready() ) return 'fail'
			if( this.failed() ) return 'fail'
			if( this.busy() ) return 'wait'
			return this.marks() ? 'done' : ''
		}

		@ $mol_mem
		override status() {

			// Ячейка волокна должна кем-то читаться, иначе её сметёт вместе с разбором.
			this.task( this.slug() )

			if( !this.llm_on() ) return []
			if( !this.key_ready() ) return [ 'Нужен ключ OpenRouter. Вставь свой в поле выше.' ]

			const failed = this.failed()
			if( failed ) return [ '📛 ' + failed ]

			if( this.busy() ) return [ 'Модель читает абзацы…' ]

			const marks = this.marks()
			if( !marks ) return []

			const name = this.done()?.name ?? ''
			const label = this.$.$bog_slop_model_names[ name ] ?? name

			return [ `${ label } разметила абзацев: ${ marks.length }` ]
		}

		override note() {
			if( this.marks() ) return 'Четыре семантические метрики размечены моделью по абзацам, остальные посчитаны по разметке текста.'
			return 'Без модели считаются только структурные метрики. Антитезы, афоризмы, ссылки на «многих» и тающая к концу конкретика требуют модели, которая читает смысл абзацев.'
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
			return this.verdict().ids.map( id => this.Metric( id ) )
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
