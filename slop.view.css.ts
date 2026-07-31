namespace $.$$ {

	$mol_style_define( $bog_slop, {

		Body_content: {
			gap: $mol_gap.block,
			maxWidth: '52rem',
			width: '100%',
			margin: { left: 'auto', right: 'auto', top: 0, bottom: 0 },
		},

		Input: {
			flex: { grow: 0, shrink: 0, basis: 'auto' },
			minHeight: '8rem',
		},

		Report: {
			flex: { direction: 'column', grow: 0, shrink: 0 },
			gap: $mol_gap.space,
		},

		Empty: {
			color: $mol_theme.shade,
			padding: $mol_gap.text,
		},

		Metrics: {
			flex: { direction: 'column' },
			gap: $mol_gap.space,
			padding: $mol_gap.text,
		},

		Note: {
			color: $mol_theme.shade,
			font: { size: '.8125rem' },
			padding: $mol_gap.text,
		},

		'@': {
			bog_slop_popup: {
				true: {
					width: '46rem',
					minWidth: '46rem',
					height: '36rem',
					minHeight: '36rem',
				},
			},
		},

	} )

	$mol_style_define( $bog_slop_verdict, {

		align: { items: 'center' },
		gap: $mol_gap.block,
		padding: $mol_gap.block,
		background: { color: $mol_theme.card },
		border: { radius: $mol_gap.round },

		Index: {
			font: { size: '2.5rem', weight: 'bold' },
			minWidth: '4.5rem',
		},

		Side: {
			flex: { direction: 'column', shrink: 1 },
			minWidth: 0,
		},

		Label: {
			font: { size: '1.125rem', weight: 'bold' },
		},

		Note: {
			color: $mol_theme.shade,
			font: { size: '.8125rem' },
		},

		'@': {
			bog_slop_tier: {
				human: { color: '#2f9e44' },
				mixed: { color: '#e8a317' },
				ai: { color: '#e5484d' },
			},
		},

	} )

	$mol_style_define( $bog_slop_bar, {

		flex: { direction: 'column', shrink: 0 },
		gap: '.25rem',

		Head: {
			justify: { content: 'space-between' },
			gap: $mol_gap.space,
		},

		Title: {
			flex: { shrink: 1 },
			minWidth: 0,
		},

		Value: {
			color: $mol_theme.shade,
			font: { family: 'monospace' },
		},

		Bar: {
			width: '100%',
			height: '.5rem',
			maxHeight: '.5rem',
			minHeight: '.5rem',
			flex: { grow: 0, shrink: 0, basis: 'auto' },
		},

	} )

}
