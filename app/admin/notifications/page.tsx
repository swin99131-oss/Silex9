'use client'

import { useEffect, useState } from 'react'
import { DataTable } from '@/components/admin/DataTable'
import { StatusChip } from '@/components/admin/StatusChip'
import { PAGE_SIZE, listNotifications } from '@/lib/admin/api'
import type { WithCity } from '@/lib/admin/api'
import type { Notification } from '@/lib/admin/types'
import { supabase } from '@/lib/supabase'

type Row = WithCity<Notification>

const TYPES: Record<string, string> = {
	admin: 'إشعار إداري',
	campaign: 'حملة إعلانية',
	like: 'إعجاب',
	comment: 'تعليق',
	follow: 'متابعة',
	message: 'رسالة',
	call: 'اتصال',
	order: 'طلب',
	general: 'عام',
}

export default function NotificationsPage() {
	const [rows, setRows] = useState<Row[]>([])
	const [names, setNames] = useState<Record<string, string>>({})
	const [total, setTotal] = useState(0)
	const [page, setPage] = useState(0)
	const [search, setSearch] = useState('')
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')

	useEffect(() => {
		let active = true
		setLoading(true)
		listNotifications({ page, search })
			.then(async (result) => {
				const ids = Array.from(new Set(result.rows.map((row) => row.user_id).filter(Boolean)))
				let recipientNames: Record<string, string> = {}
				if (ids.length) {
					const { data } = await supabase
						.from('profiles')
						.select('id, full_name, display_name, store_name, username')
						.in('id', ids)
					recipientNames = Object.fromEntries(
						(data ?? []).map((profile) => [
							profile.id,
							profile.store_name || profile.full_name || profile.display_name || profile.username || 'بدون اسم',
						]),
					)
				}
				if (!active) return
				setRows(result.rows)
				setNames(recipientNames)
				setTotal(result.total)
				setError('')
			})
			.catch((e) => {
				if (active) setError(e instanceof Error ? e.message : 'تعذّر تحميل الإشعارات')
			})
			.finally(() => {
				if (active) setLoading(false)
			})
		return () => {
			active = false
		}
	}, [page, search])

	function updateSearch(value: string) {
		setSearch(value)
		setPage(0)
	}

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h1 className="text-2xl font-semibold">الإشعارات</h1>
				<p className="mt-2 text-sm text-muted">سجل الإشعارات المرسلة إلى المستخدمين.</p>
			</div>
			{error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
			<DataTable<Row>
				data={rows}
				loading={loading}
				total={total}
				page={page}
				pageSize={PAGE_SIZE}
				onPageChange={setPage}
				search={search}
				onSearchChange={updateSearch}
				searchPlaceholder="ابحث في العنوان أو المحتوى أو النوع"
				columns={[
					{ key: 'recipient', header: 'المستلم', render: (row) => names[row.user_id] ?? row.user_id },
					{ key: 'city', header: 'المدينة', render: (row) => row.city ?? '—' },
					{ key: 'title', header: 'العنوان', render: (row) => row.title ?? '—' },
					{ key: 'body', header: 'المحتوى', render: (row) => <span className="line-clamp-2 max-w-sm">{row.body ?? '—'}</span> },
					{ key: 'type', header: 'النوع', render: (row) => <StatusChip>{TYPES[row.type ?? ''] ?? row.type ?? 'عام'}</StatusChip> },
					{
						key: 'read',
						header: 'القراءة',
						render: (row) => <StatusChip status={row.read_at ? 'neutral' : 'success'}>{row.read_at ? 'مقروء' : 'غير مقروء'}</StatusChip>,
					},
					{ key: 'created', header: 'التاريخ', render: (row) => new Date(row.created_at).toLocaleString('ar') },
				]}
			/>
		</div>
	)
}
