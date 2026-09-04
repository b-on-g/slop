namespace $ {

	/**
	 * Ключи OpenRouter, зашитые в сборку. Перебираются по кругу, пока какой-нибудь не ответит.
	 * Ключ из настроек приложения всегда важнее этого списка.
	 * Взять свой: https://openrouter.ai/keys
	 */
	export const $bog_slop_model_keys: readonly string[] = [
		// 'sk-or-v1-…',
	]

	/**
	 * Бесплатные модели OpenRouter — идентификатор и короткое имя для списка.
	 * Порядок и есть очередь запасных: выбранная идёт первой, дальше по списку.
	 * Первые две отвечали строгим JSON с первой попытки на проверке 04.09.2026,
	 * у остальных общий пул провайдера регулярно отдаёт 429 или 502.
	 */
	export const $bog_slop_model_names: Record< string, string > = {
		'minimax/minimax-m3:free': 'MiniMax M3',
		'minimax/minimax-m2.7:free': 'MiniMax M2.7',
		'inclusionai/ling-3.0-flash-fin:free': 'Ling 3.0 Flash',
		'dots-studio/dots-3-note-preview:free': 'Dots 3 Note',
		'z-ai/glm-5.2:free': 'GLM 5.2',
		'google/gemma-4-31b-it:free': 'Gemma 4 31B',
		'google/gemma-4-26b-a4b-it:free': 'Gemma 4 26B',
		'nvidia/nemotron-3-super-120b-a12b:free': 'Nemotron 3 Super 120B',
		'nvidia/nemotron-3-ultra-550b-a55b:free': 'Nemotron 3 Ultra 550B',
	}

	/** Модель по умолчанию. */
	export const $bog_slop_model_name_default = Object.keys( $bog_slop_model_names )[0]

	/** Системный промпт из статьи, дословно. */
	const RULES = `Ты — литературный редактор. Тебе присылают пронумерованные абзацы русского текста. Для КАЖДОГО абзаца определи:

1. Какие из паттернов присутствуют (ноль, один или несколько):
- antithesis: риторическое противопоставление не X, а Y / дело не в X, а в Y, использованное как разгон, а не по содержательной необходимости;
- aphorism: абзац закругляется короткой цитируемой фразой-выводом, как афоризм;
- vague_attribution: есть отсылка к обобщенному авторитету (исследования показывают, играет ключевую роль, стало поворотным моментом) без конкретного имени, источника или цифры;
- pseudo_sincerity: попытка искусственно расположить читателя уверениями в честности (честно говоря, без воды, давайте будем честны, спойлер).

2. concreteness — оцени плотность конкретики в абзаце по шкале 0-2:
0 = только общие обтекаемые формулировки без единого факта, числа, имени;
1 = смешанный текст;
2 = плотная конкретика (числа, даты, имена, точные примеры).

Ответь СТРОГО валидным JSON-объектом, содержащим единственный ключ "items", в котором лежит массив результатов для ВСЕХ переданных абзацев. Формат:
{"items": [{"id": 1, "patterns": ["aphorism"], "concreteness": 0}, {"id": 2, "patterns": [], "concreteness": 2}]}

Если для абзаца паттернов нет — верни пустой список "patterns". Не добавляй абзацев, которых не было во входных данных, и не меняй нумерацию id.`

	/** Куски текста, каждый из которых может оказаться валидным JSON. */
	function* chunks_of( text: string ) {

		yield text

		const pairs: Record< string, string > = { '{': '}', '[': ']' }

		for( let start = 0; start < text.length; ++start ) {

			const open = text[ start ]
			const close = pairs[ open ]
			if( !close ) continue

			let depth = 0
			let quoted = false
			let escaped = false

			for( let pos = start; pos < text.length; ++pos ) {

				const char = text[ pos ]

				if( escaped ) { escaped = false; continue }
				if( char === '\\' ) { escaped = true; continue }
				if( char === '"' ) { quoted = !quoted; continue }
				if( quoted ) continue

				if( char === open ) ++depth
				else if( char === close && !--depth ) {
					yield text.slice( start, pos + 1 )
					break
				}

			}

		}

	}

	/** Достаёт массив разметок из ответа модели, даже если тот завёрнут в болтовню или ограждение кода. */
	export function $bog_slop_model_items( raw: string ) {

		const text = raw.replace( /```[a-z]*/gi, '' ).trim()

		for( const chunk of chunks_of( text ) ) {

			let data: any
			try { data = JSON.parse( chunk ) } catch( error ) { continue }

			const items = Array.isArray( data ) ? data : data?.items
			if( Array.isArray( items ) ) return items

		}

		return null
	}

	/** Ответ модели и имя той, что его дала. */
	export type $bog_slop_model_reply = {
		text: string
		name: string
	}

	/** Клиент OpenRouter, размечающий абзацы по семантическим паттернам слопа. */
	export class $bog_slop_model extends $mol_object {

		/** Ключ, введённый пользователем. Пустой — берётся зашитый пул. */
		key() { return '' }

		/** Идентификатор модели OpenRouter. */
		name() { return $bog_slop_model_name_default }

		/** Сколько абзацев уходит в один запрос. */
		batch() { return 10 }

		keys() {
			const own = this.key().trim()
			return own ? [ own ] : this.$.$bog_slop_model_keys
		}

		/** Выбранная модель первой, остальные бесплатные за ней запасными. */
		names() {
			const name = this.name()
			return [ name, ... Object.keys( this.$.$bog_slop_model_names ).filter( other => other !== name ) ]
		}

		request( name: string, key: string, prompt: string ) {
			return this.$.$mol_fetch.json(
				'https://openrouter.ai/api/v1/chat/completions',
				{
					method: 'POST',
					headers: {
						'Authorization': 'Bearer ' + key,
						'Content-Type': 'application/json',
						'X-Title': 'Slopometer',
					},
					body: JSON.stringify({
						model: name,
						stream: false,
						temperature: 0.1,
						messages: [
							{ role: 'system', content: RULES },
							{ role: 'user', content: prompt },
						],
					}),
				}
			) as any
		}

		/** Текст ошибки, который вернул сам OpenRouter. */
		reason( resp: $mol_fetch_response ) {

			try {
				const data = resp.json() as any
				const text = data?.error?.message
				if( typeof text === 'string' && text ) return text
			} catch( error ) {
				if( $mol_promise_like( error ) ) $mol_fail_hidden( error )
			}

			return 'HTTP ' + resp.code()
		}

		/**
		 * Один запрос с перебором моделей и ключей.
		 * У бесплатных моделей пул провайдера общий на всех, так что 429 и 502 — это норма
		 * рабочего дня, а не поломка: упёрлись — идём к следующей модели.
		 */
		@ $mol_action
		shot( prompt: string ): $bog_slop_model_reply {

			const keys = this.keys()
			if( !keys.length ) $mol_fail( new Error( 'Нет ключа OpenRouter' ) )

			let last = 'Ни одна бесплатная модель не ответила'

			for( const key of keys ) {

				for( const name of this.names() ) {

					try {

						const resp = this.request( name, key, prompt )
						const content = resp?.choices?.[0]?.message?.content
						if( typeof content === 'string' && content.trim() ) return { text: content, name }

						last = `${ name }: пустой ответ`

					} catch( error: any ) {

						const resp = error?.cause as $mol_fetch_response
						if( !resp?.code ) $mol_fail_hidden( error )

						// Ключ не приняли — остальные модели с ним тоже не выйдут
						if( resp.code() === 401 ) {
							last = this.reason( resp )
							break
						}

						last = `${ name }: ${ this.reason( resp ) }`

					}

				}

			}

			return $mol_fail( new Error( last ) )
		}

		/** Разметка каждого абзаца: найденные паттерны и плотность конкретики. */
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
			let used = this.name()

			for( let start = 0; start < eligible.length; start += size ) {

				const batch = eligible.slice( start, start + size )
				const prompt = batch.map( index => `[${ index + 1 }] ${ paras[ index ] }` ).join( '\n\n' )

				const reply = this.shot( prompt )
				used = reply.name

				const items = $bog_slop_model_items( reply.text ) ?? []

				for( const item of items ) {

					const index = Number( item?.id ) - 1
					if( batch.indexOf( index ) < 0 ) continue

					const patterns = Array.isArray( item?.patterns )
						? item.patterns.filter( ( name: unknown )=> $bog_slop_metrics_ids_llm.indexOf( name as any ) >= 0 )
						: []

					const level = Number( item?.concreteness )

					marks[ index ] = {
						patterns,
						concreteness: level === 0 || level === 1 || level === 2 ? level : null,
					}

				}

			}

			return {
				marks: marks as readonly $bog_slop_metrics_semantics[],
				name: used,
			}
		}

	}

}
