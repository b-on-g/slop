namespace $ {

	export type $bog_slop_metrics_tier = 'human' | 'mixed' | 'ai'

	export type $bog_slop_metrics_report = {
		final: number
		tier: $bog_slop_metrics_tier
		scores: Record< string, number >
		paras: number
	}

	export const $bog_slop_metrics_ids = [
		'em_dash',
		'one_liner',
		'heading',
		'filler',
		'triad',
		'pseudo_sincerity',
	] as const

	export const $bog_slop_metrics_weights: Record< string, number > = {
		em_dash: 0.6,
		one_liner: 0.4,
		heading: 0.9,
		filler: 0.8,
		triad: 0.8,
		pseudo_sincerity: 0.7,
	}

	export const $bog_slop_metrics_titles: Record< string, string > = {
		em_dash: 'Длинные тире',
		one_liner: 'Абзацы в одну строку',
		heading: 'Заголовки под копирку',
		filler: 'Слова-прокладки',
		triad: 'Перечисления по три',
		pseudo_sincerity: 'Псевдооткровенность',
	}

	export const $bog_slop_metrics_bands: Record< $bog_slop_metrics_tier, readonly [ number, number ] > = {
		human: [ 0.00, 0.35 ],
		mixed: [ 0.35, 0.65 ],
		ai: [ 0.65, 1.00 ],
	}

	const WEIGHT_POWER = 2.0
	const FULL_THRESHOLD = 0.90
	const HIGH_THRESHOLD = 0.55
	const MIN_HIGH_FOR_SYSTEMIC = 4

	const FILLER_PHRASES = [
		'грубо говоря', 'по сути', 'казалось бы', 'на самом деле', 'хуже того',
		'выходит,', 'стоит отметить', 'важно отметить', 'нельзя не отметить',
		'как ни странно', 'так или иначе', 'в конечном счете', 'проще говоря',
	]

	const SINCERITY_MARKERS = [ 'честно говоря', 'без воды', 'будем честны', 'спойлер' ]

	const DRAMA_HEADING_MARKERS = [
		'почему', 'зачем', 'секрет', 'правда', 'ошибк', 'провал', 'боль',
		'магия', 'ловушк', 'убий', 'против', ' vs ', 'что дальше', 'спасен',
		'катастроф', 'хаос',
	]

	const TABLE_PREFIXES = [ '|', '-', '*', '>', '1', '2', '3', '4', '5', '6', '7', '8', '9' ]

	const WORD_RE = /[\p{L}\p{N}_]+/gu

	const TRIAD_RE = /[\p{L}\p{N}_$-]+(?:[^,.!?\n]{0,30})?,\s+[\p{L}\p{N}_$-]+(?:[^,.!?\n]{0,30})?\s+и\s+[\p{L}\p{N}_$-]+/u

	export function $bog_slop_metrics_clamp01( val: number ) {
		return Math.max( 0, Math.min( 1, val ) )
	}

	function lines_of( text: string ) {
		return text.split( /\r?\n/ )
	}

	function chars_of( text: string ) {
		return Array.from( text ).length
	}

	function count_of( hay: string, needle: string ) {
		if( !needle ) return 0
		let hits = 0
		let pos = hay.indexOf( needle )
		while( pos >= 0 ) {
			hits += 1
			pos = hay.indexOf( needle, pos + needle.length )
		}
		return hits
	}

	export function $bog_slop_metrics_strip( text: string ) {
		return text
			.replace( /```[\s\S]*?```/g, '' )
			.replace( /<img[^>]*>/g, '' )
			.replace( /!\[[^\]]*\]\([^)]*\)/g, '' )
			.replace( /\[([^\]]*)\]\([^)]*\)/g, '$1' )
	}

	export function $bog_slop_metrics_paras( text: string ) {

		const paras = [] as string[]

		for( let block of text.split( /\n\s*\n/ ) ) {

			block = block.trim()
			if( !block ) continue

			if( block.startsWith( '#' ) ) {
				const rest = lines_of( block )
					.filter( line => !/^#{1,6}\s/.test( line ) )
					.join( '\n' )
					.trim()
				if( !rest ) continue
				block = rest
			}

			const table = block.includes( '|' ) && lines_of( block ).every( line => {
				const head = line.trimStart()
				return TABLE_PREFIXES.some( pre => head.startsWith( pre ) )
					&& !/^[-*]\s+\S/.test( head )
			} )
			if( table ) continue

			paras.push( block )
		}

		return paras
	}

	function headings_of( text: string ) {
		return lines_of( text )
			.filter( line => /^#{1,6}\s/.test( line ) )
			.map( line => line.replace( /^#+\s*/, '' ).trim() )
	}

	function list_blocks( text: string ) {

		const lens = [] as number[]
		let cur = 0

		for( const line of lines_of( text ) ) {
			if( /^\s*([-*]|\d+[.)])\s+\S/.test( line ) ) {
				cur += 1
			} else {
				if( cur ) lens.push( cur )
				cur = 0
			}
		}
		if( cur ) lens.push( cur )

		return lens
	}

	function word_count( text: string ) {
		return ( text.match( WORD_RE ) ?? [] ).length
	}

	function metric_em_dash( paras: readonly string[] ) {
		if( !paras.length ) return 0
		const ratio = paras.filter( para => para.includes( '—' ) ).length / paras.length
		return $bog_slop_metrics_clamp01( ( ratio - 0.15 ) / 0.55 )
	}

	function metric_one_liner( paras: readonly string[] ) {

		const eligible = paras.filter( para => !/^\*\*[^*]+\*\*$/.test( para ) )
		if( !eligible.length ) return 0

		const hits = eligible.filter( para =>
			chars_of( para ) < 90
			&& ( para.match( /[.!?…]/g ) ?? [] ).length <= 1
			&& !para.includes( '\n' )
		).length

		return $bog_slop_metrics_clamp01( ( hits / eligible.length - 0.05 ) / 0.25 )
	}

	function metric_heading( heads: readonly string[] ) {

		if( heads.length < 3 ) return 0

		const lens = heads.map( chars_of )
		const mean_len = lens.reduce( ( sum, len ) => sum + len, 0 ) / lens.length
		const variance = lens.reduce( ( sum, len ) => sum + ( len - mean_len ) ** 2, 0 ) / ( lens.length - 1 )
		const stdev_len = Math.sqrt( variance )
		const uniformity = 1 - $bog_slop_metrics_clamp01( stdev_len / Math.max( 1, mean_len ) )

		const drama_hits = heads.filter( head => {
			const low = head.toLowerCase()
			return DRAMA_HEADING_MARKERS.some( marker => low.includes( marker ) )
		} ).length
		const drama_ratio = drama_hits / heads.length

		return $bog_slop_metrics_clamp01( 0.5 * uniformity + 0.7 * drama_ratio )
	}

	function metric_filler( text: string ) {
		const low = text.toLowerCase()
		let total_hits = 0
		for( const phrase of FILLER_PHRASES ) total_hits += count_of( low, phrase )
		const per_1000w = 1000 * total_hits / Math.max( 1, word_count( text ) )
		return $bog_slop_metrics_clamp01( per_1000w / 4.0 )
	}

	function metric_triad( paras: readonly string[], text: string ) {

		if( !paras.length ) return 0

		const inline_ratio = paras.filter( para => TRIAD_RE.test( para ) ).length / paras.length
		const lists = list_blocks( text )
		const list_ratio = lists.length
			? lists.filter( len => len === 3 ).length / lists.length
			: 0

		return $bog_slop_metrics_clamp01( inline_ratio / 0.3 * 0.6 + list_ratio * 0.4 )
	}

	function sincerity_boost( text: string ) {
		const low = text.toLowerCase()
		let hits = 0
		for( const marker of SINCERITY_MARKERS ) hits += count_of( low, marker )
		return hits
	}

	export function $bog_slop_metrics_tier_of( scores: Record< string, number > ): $bog_slop_metrics_tier {

		const vals = Object.values( scores )
		const full = vals.filter( score => score >= FULL_THRESHOLD ).length
		const high = vals.filter( score => score >= HIGH_THRESHOLD ).length

		if( ( full >= 2 && high >= MIN_HIGH_FOR_SYSTEMIC ) || full >= 3 ) return 'ai'
		if( full >= 1 || high >= MIN_HIGH_FOR_SYSTEMIC ) return 'mixed'
		return 'human'
	}

	export function $bog_slop_metrics( markdown: string ): $bog_slop_metrics_report {

		const text = $bog_slop_metrics_strip( markdown || '' )
		const paras = $bog_slop_metrics_paras( text )
		const heads = headings_of( text )

		const scores: Record< string, number > = {
			em_dash: metric_em_dash( paras ),
			one_liner: metric_one_liner( paras ),
			heading: metric_heading( heads ),
			filler: metric_filler( text ),
			triad: metric_triad( paras, text ),
			pseudo_sincerity: $bog_slop_metrics_clamp01( sincerity_boost( text ) * 0.1 ),
		}

		let num = 0
		let den = 0
		for( const id of $bog_slop_metrics_ids ) {
			const score = scores[ id ]
			const weight = $bog_slop_metrics_weights[ id ]
			num += score * score ** WEIGHT_POWER * weight
			den += weight
		}

		const intensity = den ? num / den : 0
		const tier = $bog_slop_metrics_tier_of( scores )
		const [ low, high ] = $bog_slop_metrics_bands[ tier ]
		const final = low + $bog_slop_metrics_clamp01( intensity ) * ( high - low )

		return { final, tier, scores, paras: paras.length }
	}

}
