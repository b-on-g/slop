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
			for( const id of $bog_slop_metrics_ids ) {
				$mol_assert_equal( report.scores[ id ], 0 )
			}
			$mol_assert_equal( report.final, 0 )
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
			for( const id of $bog_slop_metrics_ids ) {
				$mol_assert_equal( Number.isFinite( report.scores[ id ] ), true )
			}
		},

	})

}
