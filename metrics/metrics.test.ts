namespace $ {

	const text_dashes = [
		'Первый абзац — тут есть длинное тире и достаточно текста, чтобы абзац не считался короткой однострочной репликой.',
		'Второй абзац — снова тире, снова много букв, потому что иначе подскочит совсем другая метрика.',
		'Третий абзац — и здесь тире, и здесь длинный текст ради чистоты эксперимента с одной метрикой.',
	].join( '\n\n' )

	const text_short = [
		'Всё оказалось проще.',
		'Мы просто убрали лишнее.',
		'Работает быстрее.',
		'Такие дела.',
	].join( '\n\n' )

	const text_filler = [
		'По сути мы переписали слой хранения заново, потому что старый не держал нагрузку на пиках трафика.',
		'Казалось бы, хватит одного индекса, но на самом деле планировщик всё равно уходил в полный скан таблицы.',
	].join( '\n\n' )

	const text_human = [
		'Мы поставили эксперимент на реальном проекте. Сначала собрали метрики на трёх сборках подряд. Потом сравнили результаты с прошлой неделей.',
		'Оказалось что кэш прогревается дольше ожидаемого. Мы вынесли прогрев в отдельный шаг пайплайна. После этого время холодного старта упало вдвое.',
		'Отчёт лежит в репозитории рядом с исходниками теста. Там же скрипт который повторяет замер локально. Запускать его можно без дополнительных прав.',
	].join( '\n\n' )

	// Телеграм-пост про SSH-прокси: код без ограждений, реплики в одну строку,
	// антитезы и афористичные концовки. На глаз слоповый, а вердикт держится на human.
	const text_post = [
		'Здарова, вайбкодеры!',
		'Расскажу историю про прокси. Мне она понравилась своей симметрией.',
		'Кейс такой. Есть внешний сервис, с которым нашему беку надо разговаривать. Из нашей сети сервис не открывается: его прикрыли на уровне провайдера. Ну ок, не в первый раз.',
		'Берем самый дешевый VPS в Нидерландах. Одно ядро, гиг памяти, за такое даже не жалко. И ничего на него не ставим. Вообще. Там уже есть sshd, больше ничего и не надо.',
		'Вся магия на нашем беке. Он делает ssh -D 1080 в сторону этого VPS, и SSH-клиент открывает локальный SOCKS5-порт. Весь трафик из этого порта уходит в туннель и выходит наружу с голландского IP. Оборачиваем в autossh, чтобы само переподнималось, кладем в systemd:',
		'autossh -M 0 -N -D 127.0.0.1:1080 \\\n  -o ExitOnForwardFailure=yes \\\n  -o ServerAliveInterval=30 \\\n  -o ServerAliveCountMax=3 \\\n  user@vps',
		'Опции тут не для красоты. -M 0 отключает собственный мониторинг autossh, за живость отвечает ServerAlive. -N говорит ssh не открывать шелл, нам нужен только туннель. ExitOnForwardFailure=yes заставляет ssh умереть, если порт 1080 не забиндился. Без этой опции ssh живет, autossh доволен, а прокси мертв, и узнаешь ты об этом через месяц из логов с таймаутами. ServerAliveInterval нужен, чтобы подвисший туннель заметили и перезапустили, а не ждали, пока TCP сам сдастся.',
		'В итоге на беке появляется socks://127.0.0.1:1080, из которого мир выглядит голландским 🏖.',
		'А в коде почти ничего. Одна функция, которая из урла делает агент:',
		'import { Agent } from \"node:http\";\nimport { SocksProxyAgent } from \"socks-proxy-agent\";',
		'export function createProxyAgent(proxyUrl: string): Agent {\n  return new SocksProxyAgent(proxyUrl);\n}',
		'Схема socks:// тут не случайна. В socks-proxy-agent голый socks:// это то же, что socks5h://: SOCKS5 с резолвом DNS на стороне прокси. Напиши я socks5://, имя сервиса резолвилось бы локально, у того самого провайдера, который его и прикрыл. Туннель был бы жив, а запросы бы ложились на первом же шаге.',
		'И аксиос, которому этот агент скармливаем:',
		'const agent = createProxyAgent(process.env.PROXY_URL);',
		'export const http = axios.create({\n  httpAgent: agent,\n  httpsAgent: agent,\n  proxy: false,\n});',
		'Через этот инстанс ходит только то, что без прокси не открывается. Все остальное живет на обычном аксиосе. VPS за три евро с одним ядром не должен быть точкой отказа для всех интеграций сразу.',
		'Все. Один env с урлом прокси, аксиос ходит через Европу и не знает, что его кто-то блокирует. Полчаса на все, забыли.',
		'А потом случилось смешное.',
		'Понадобился другой сервис. Заходим, а нас не пускают. Только на этот раз не с нашей стороны, а с той. Сервис посмотрел на наш IP и решил, что с таким регионом он не работает. Первый нельзя, потому что мы отсюда. Второй нельзя, потому что мы отсюда. Разные страны, разные правила, один и тот же 403.',
		'Сижу, думаю, что надо опять что-то поднимать. И тут доходит: да не надо. Канал уже есть. Тот же http инстанс, второй сервис видит запрос из Европы, всем норм. Ни одной строчки кода. Лан, один импорт и замена axios на http. Все.',
		'P.S. Да, в начале я чуть приврал. \"Ничего не ставим\" не значит \"ничего не делаем\": ключ бека положить на VPS, пароли в sshd выключить, файрвол на VPS закрыть на все, кроме 22 с IP бека. Но это все тот же вечер, и никакого софта на VPS так и не появилось.',
		'Такие дела.',
	].join( '\n\n' )

	/** Разметка, которую на этом посте дала minimax-m3 через OpenRouter 04.09.2026. */
	const marks_post = [
		[ null, [] ], [ 1, [] ], [ 1, [ 'aphorism' ] ], [ 2, [] ], [ 2, [] ], [ 2, [] ],
		[ 2, [] ], [ 2, [] ], [ 1, [] ], [ 2, [] ], [ 2, [] ], [ 2, [] ], [ 0, [] ],
		[ 2, [] ], [ 2, [] ], [ 1, [ 'antithesis' ] ], [ 1, [ 'aphorism' ] ], [ null, [] ],
		[ 1, [ 'antithesis' ] ], [ 1, [] ], [ 1, [ 'pseudo_sincerity' ] ], [ null, [] ],
	].map( ([ concreteness, patterns ])=> ({
		concreteness: concreteness as number | null,
		patterns: patterns as string[],
	}) )

	$mol_test({

		'Тире в каждом абзаце даёт максимальный em_dash'() {
			const report = $bog_slop_metrics( text_dashes )
			$mol_assert_equal( report.paras, 3 )
			$mol_assert_equal( report.scores.em_dash, 1 )
		},

		'Короткие однострочные абзацы дают максимальный one_liner'() {
			const report = $bog_slop_metrics( text_short )
			$mol_assert_equal( report.paras, 4 )
			$mol_assert_equal( report.scores.one_liner, 1 )
			$mol_assert_equal( report.scores.em_dash, 0 )
		},

		'Фразы-прокладки поднимают filler выше нуля'() {
			$mol_assert_equal( $bog_slop_metrics( text_filler ).scores.filler > 0, true )
			$mol_assert_equal( $bog_slop_metrics( text_human ).scores.filler, 0 )
		},

		'Чистый развёрнутый текст остаётся human'() {
			const report = $bog_slop_metrics( text_human )
			$mol_assert_equal( report.tier, 'human' )
			for( const id of report.ids ) {
				$mol_assert_equal( report.scores[ id ], 0 )
			}
			$mol_assert_equal( report.final, 0 )
		},

		'Без разметки модели считаются только шесть метрик'() {
			const report = $bog_slop_metrics( text_human )
			$mol_assert_equal( report.ids.length, 6 )
			$mol_assert_equal( report.ids.indexOf( 'antithesis' ), -1 )
			$mol_assert_equal( report.ids.indexOf( 'concreteness_decay' ), -1 )
		},

		'Одна метрика в потолке тянет индекс на верх своей полосы'() {
			const report = $bog_slop_metrics( text_dashes )
			$mol_assert_equal( report.tier, 'mixed' )
			$mol_assert_equal( Math.abs( report.final - 0.65 ) < 1e-9, true )
		},

		'clamp01 режет края, итог не выходит за границы полосы'() {

			$mol_assert_equal( $bog_slop_metrics_clamp01( -0.5 ), 0 )
			$mol_assert_equal( $bog_slop_metrics_clamp01( 1.5 ), 1 )
			$mol_assert_equal( $bog_slop_metrics_clamp01( 0.25 ), 0.25 )

			for( const source of [ '', text_dashes, text_short, text_filler, text_human ] ) {
				const report = $bog_slop_metrics( source )
				const [ low, high ] = $bog_slop_metrics_bands[ report.tier ]
				$mol_assert_equal( report.final >= low, true )
				$mol_assert_equal( report.final <= high, true )
			}

		},

		'Пустой ввод даёт нули без NaN'() {
			const report = $bog_slop_metrics( '' )
			$mol_assert_equal( report.paras, 0 )
			$mol_assert_equal( report.final, 0 )
			$mol_assert_equal( report.tier, 'human' )
			for( const id of report.ids ) {
				$mol_assert_equal( Number.isFinite( report.scores[ id ] ), true )
			}
		},

		'Конкретика, падающая к концу, даёт положительный наклон'() {
			$mol_assert_equal( $bog_slop_metrics_decay([ 2, 2, 1, 1, 0, 0 ]) > 0, true )
			$mol_assert_equal( $bog_slop_metrics_decay([ 0, 0, 1, 1, 2, 2 ]), 0 )
			$mol_assert_equal( $bog_slop_metrics_decay([ 2, 2, 2, 2 ]), 0 )
		},

		'Меньше четырёх оценённых абзацев — тренд не считается'() {
			$mol_assert_equal( $bog_slop_metrics_decay([ 2, 1, 0 ]), 0 )
			$mol_assert_equal( $bog_slop_metrics_decay([ 2, null, 1, null, 0 ]), 0 )
		},

		'Разметка модели добавляет четыре семантические метрики'() {

			const marks = $bog_slop_metrics_paras( text_human ).map( ( para, index )=> ({
				patterns: index ? [] : [ 'antithesis' ],
				concreteness: 2 - index,
			}) )

			const report = $bog_slop_metrics( text_human, marks )

			$mol_assert_equal( report.ids.length, 10 )
			$mol_assert_equal( report.scores.antithesis > 0, true )
			$mol_assert_equal( report.scores.aphorism, 0 )
			$mol_assert_equal( Number.isFinite( report.scores.concreteness_decay ), true )
		},

		'Код без ограждений остаётся полноценным абзацем'() {

			const paras = $bog_slop_metrics_paras( $bog_slop_metrics_strip( text_post ) )
			$mol_assert_equal( paras.length, 22 )

			// Пять абзацев из двадцати двух — голые shell и TS. Они проходят и strip,
			// и фильтр прозы, так что разбавляют знаменатель каждой доли на четверть.
			const code = [ 5, 9, 10, 13, 14 ]
			for( const index of code ) $mol_assert_equal( $bog_slop_metrics_prose( paras[ index ] ), true )
			$mol_assert_equal( paras[5].startsWith( 'autossh' ), true )
		},

		'Короткая реплика модели не достаётся, но из знаменателя не выпадает'() {

			// Ровно те три абзаца, где слоп слышнее всего, модель и не увидит.
			$mol_assert_equal( $bog_slop_metrics_prose( 'Такие дела.' ), false )
			$mol_assert_equal( $bog_slop_metrics_prose( 'А потом случилось смешное.' ), false )
			$mol_assert_equal( $bog_slop_metrics_prose( 'Здарова, вайбкодеры!' ), false )

			// Две антитезы на 22 абзаца, хотя прочитано было 19.
			const report = $bog_slop_metrics( text_post, marks_post )
			$mol_assert_equal( report.scores.antithesis.toFixed( 4 ), ( ( 2 / 22 - 0.02 ) / 0.35 ).toFixed( 4 ) )
		},

		'Три метрики выше HIGH без единой на FULL держат вердикт human'() {

			$mol_assert_equal( $bog_slop_metrics_tier_of({ a: 0.71, b: 0.64, c: 0.73 }), 'human' )
			$mol_assert_equal( $bog_slop_metrics_tier_of({ a: 0.71, b: 0.64, c: 0.73, d: 0.56 }), 'mixed' )
			$mol_assert_equal( $bog_slop_metrics_tier_of({ a: 0.91 }), 'mixed' )

			// Полоса human кончается на 0.35, так что интенсивность выше в индекс не пролезает.
			for( const marks of [ null, marks_post ] ) {
				const report = $bog_slop_metrics( text_post, marks )
				$mol_assert_equal( report.tier, 'human' )
				$mol_assert_equal( report.final <= 0.35, true )
			}
		},

		'На посте про прокси три метрики упираются в HIGH и ни одна не берёт FULL'() {

			const report = $bog_slop_metrics( text_post, marks_post )
			const high = report.ids.filter( id => report.scores[ id ] >= 0.55 )
			const full = report.ids.filter( id => report.scores[ id ] >= 0.90 )

			$mol_assert_equal( full.length, 0 )
			$mol_assert_equal( high.join( ' ' ), 'one_liner triad concreteness_decay' )
		},

		'Обрывки и ограждения кода модели не отдаются'() {
			$mol_assert_equal( $bog_slop_metrics_prose( '```js\nconst a = 1\n```' ), false )
			$mol_assert_equal( $bog_slop_metrics_prose( '**Подзаголовок**' ), false )
			$mol_assert_equal( $bog_slop_metrics_prose( 'Слишком короткий абзац.' ), false )
			$mol_assert_equal( $bog_slop_metrics_prose( text_human.split( '\n\n' )[0] ), true )
		},

	})

}
