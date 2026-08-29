"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
    ArrowLeftIcon,
    ArrowDownTrayIcon,
    EyeIcon,
} from "@heroicons/react/24/outline";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    AdminPageHeader,
    AdminTableSkeleton,
    AdminErrorState,
    AdminEmptyState,
    AdminDataTable,
    adminSortableHeader,
    compareZh,
} from "@/components/admin/shared";
import {
    adminFetch,
    formatDateTime,
    timestampToMs,
    type FirestoreTimestamp,
} from "@/lib/admin-utils";
import { CUSTOM_CLUB_NAME_FIELD_IDS } from "@/lib/club-name";
import {
    getAdminFormById,
    getAdminFormResponses,
} from "@/lib/client-firestore";
import { toast } from "@/components/ui/use-toast";

interface FormFieldDef {
    id: string;
    label: string;
    type: string;
    order: number;
    required?: boolean;
    default_from_user?: string;
}

interface Form {
    id: string;
    title: string;
    description?: string;
    status: string;
    fields: FormFieldDef[];
}

interface FormResponseRecord {
    id: string;
    form_id: string;
    club_id: string;
    club_name?: string;
    submitted_by_uid: string;
    submitted_by_name?: string;
    answers: Record<string, unknown>;
    submitted_at: FirestoreTimestamp | string;
    is_duplicate_attempt: boolean;
}

function fieldTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        text: "文字",
        email: "Email",
        phone: "電話",
        number: "數字",
        select: "下拉選單",
        radio: "單選",
        checkbox: "多選",
        textarea: "多行文字",
        date: "日期",
        file: "檔案",
        club_picker: "社團選擇",
        section_header: "段落標題",
    };
    return labels[type] ?? type;
}

function ResponseDetailPanel({
    response,
    fields,
    onClose,
}: {
    response: FormResponseRecord;
    fields: FormFieldDef[];
    onClose: () => void;
}) {
    const sortedFields = [...fields].sort((a, b) => a.order - b.order);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />
            <div className="relative h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-6 py-4">
                    <h2 className="text-[15px] font-semibold text-neutral-950">回覆詳情</h2>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-6 px-6 py-5">
                    <div className="space-y-3 rounded-lg bg-neutral-50 p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] font-medium text-neutral-500">社團</span>
                            <span className="text-[13px] font-medium text-neutral-950">
                                {response.club_name ?? "—"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] font-medium text-neutral-500">提交者</span>
                            <span className="text-[13px] text-neutral-700">
                                {response.submitted_by_name ?? response.submitted_by_uid}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] font-medium text-neutral-500">提交時間</span>
                            <span className="text-[13px] text-neutral-700">
                                {formatDateTime(response.submitted_at)}
                            </span>
                        </div>
                        {response.is_duplicate_attempt && (
                            <div className="flex items-center justify-between">
                                <span className="text-[12px] font-medium text-neutral-500">狀態</span>
                                <Badge variant="warning">重複提交</Badge>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[13px] font-semibold text-neutral-950">回覆內容</h3>
                        {sortedFields.map((field) => {
                            if (field.type === "section_header") {
                                return (
                                    <div key={field.id} className="border-b border-border pb-1 pt-3">
                                        <h4 className="text-[13px] font-semibold text-neutral-800">{field.label}</h4>
                                    </div>
                                );
                            }

                            const val = response.answers[field.id];
                            let displayVal: string;
                            if (val === undefined || val === null || val === "") {
                                displayVal = "—";
                            } else if (field.type === "club_picker") {
                                displayVal = response.club_name ?? String(val);
                            } else if (Array.isArray(val)) {
                                displayVal = val.join(", ");
                            } else {
                                displayVal = String(val);
                            }

                            return (
                                <div key={field.id} className="space-y-1">
                                    <p className="text-[12px] font-medium text-neutral-500">{field.label}</p>
                                    <p className="min-h-[20px] rounded-md bg-neutral-50 px-3 py-2 text-[13px] text-neutral-900 whitespace-pre-wrap break-all">
                                        {displayVal}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

function exportCSV(form: Form, responses: FormResponseRecord[]) {
    const sortedFields = [...form.fields].sort((a, b) => a.order - b.order);
    const headerFields = sortedFields.filter((f) => f.type !== "section_header");

    const headers = [
        "社團",
        "社團 ID",
        "提交者",
        "提交時間",
        "重複提交",
        ...headerFields.map((f) => f.label),
    ];

    const rows = responses.map((r) => {
        const base = [
            r.club_name ?? "",
            r.club_id,
            r.submitted_by_name ?? "",
            formatDateTime(r.submitted_at),
            r.is_duplicate_attempt ? "是" : "否",
        ];

        const fieldVals = headerFields.map((f) => {
            const val = r.answers[f.id];
            if (val === undefined || val === null || val === "") return "";
            if (f.type === "club_picker") return r.club_name ?? String(val);
            if (Array.isArray(val)) return val.join("; ");
            return String(val);
        });

        return [...base, ...fieldVals];
    });

    const csvContent = [headers, ...rows]
        .map((row) =>
            row
                .map((cell) => {
                    const escaped = String(cell).replace(/"/g, '""');
                    return `"${escaped}"`;
                })
                .join(","),
        )
        .join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.title}_回覆_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export default function AdminFormPreviewAndResponsesPage() {
    const params = useParams();
    const formId = params.form_id as string;

    const [form, setForm] = useState<Form | null>(null);
    const [responses, setResponses] = useState<FormResponseRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedResponse, setSelectedResponse] = useState<FormResponseRecord | null>(null);

    const fetchData = useCallback(
        async (background = false) => {
            if (!background) setLoading(true);
            if (!background) setError(null);
            try {
                const [formData, responsesData] = await Promise.all([
                    getAdminFormById(formId) as Promise<Form | null>,
                    getAdminFormResponses(formId) as unknown as Promise<FormResponseRecord[]>,
                ]);
                if (!formData) throw new Error("表單不存在或已被刪除");
                setForm(formData);
                setResponses(responsesData);
            } catch (err) {
                if (!background) {
                    setError(err instanceof Error ? err.message : "載入回覆資料失敗");
                } else {
                    toast(err instanceof Error ? err.message : "載入回覆資料失敗", "error");
                }
            } finally {
                if (!background) setLoading(false);
            }
        },
        [formId],
    );

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const sortedFields = useMemo(
        () => [...(form?.fields ?? [])].sort((a, b) => a.order - b.order),
        [form?.fields],
    );

    const responseColumns = useMemo<ColumnDef<FormResponseRecord>[]>(() => {
        const cols: ColumnDef<FormResponseRecord>[] = [
            {
                id: "club",
                accessorFn: (r) => r.club_name ?? r.club_id ?? "",
                header: ({ column }) => adminSortableHeader(column, "社團"),
                sortingFn: (rowA, rowB) => compareZh(String(rowA.getValue("club")), String(rowB.getValue("club"))),
                cell: ({ row }) => (
                    <span className="font-medium text-neutral-950">
                        {row.original.club_name ?? row.original.club_id ?? "—"}
                    </span>
                ),
                meta: { thClassName: "px-5", tdClassName: "px-5" },
            },
        ];

        const visibleFields = sortedFields
            .filter(
                (f) =>
                    f.type !== "section_header" &&
                    f.type !== "club_picker" &&
                    // 自填社團名稱已併入「社團」欄顯示，不另外佔一欄
                    !CUSTOM_CLUB_NAME_FIELD_IDS.includes(f.id as never) &&
                    f.default_from_user !== "club_name" &&
                    f.default_from_user !== "club_id",
            )
            .slice(0, 3);

        for (const field of visibleFields) {
            cols.push({
                id: `field_${field.id}`,
                accessorFn: (r) => {
                    const val = r.answers[field.id];
                    if (val === undefined || val === null || val === "") return "";
                    if (Array.isArray(val)) return val.join(", ");
                    return String(val);
                },
                header: ({ column }) => adminSortableHeader(column, field.label),
                sortingFn: (rowA, rowB) =>
                    compareZh(String(rowA.getValue(`field_${field.id}`)), String(rowB.getValue(`field_${field.id}`))),
                cell: ({ row }) => {
                    const val = row.original.answers[field.id];
                    let display: string;
                    if (val === undefined || val === null || val === "") {
                        display = "—";
                    } else if (Array.isArray(val)) {
                        display = val.join(", ");
                    } else {
                        display = String(val);
                    }
                    return <span className="text-neutral-600 truncate max-w-[200px] inline-block">{display}</span>;
                },
            });
        }

        cols.push(
            {
                id: "submitted_at",
                accessorFn: (r) => timestampToMs(r.submitted_at),
                header: ({ column }) => adminSortableHeader(column, "提交時間"),
                sortingFn: "basic",
                cell: ({ row }) => <span className="text-neutral-400">{formatDateTime(row.original.submitted_at)}</span>,
            },
            {
                id: "status",
                header: "",
                enableSorting: false,
                cell: ({ row }) => (row.original.is_duplicate_attempt ? <Badge variant="warning">重複</Badge> : null),
            },
            {
                id: "actions",
                header: "",
                enableSorting: false,
                cell: ({ row }) => (
                    <button
                        type="button"
                        title="查看詳情"
                        onClick={() => setSelectedResponse(row.original)}
                        className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                        <EyeIcon className="h-4 w-4" />
                    </button>
                ),
                meta: {
                    thClassName: "px-5 text-right",
                    tdClassName: "px-5 text-right",
                },
            },
        );

        return cols;
    }, [sortedFields]);

    const statusBadge = form
        ? form.status === "open"
            ? { variant: "success" as const, label: "開放中" }
            : form.status === "closed"
                ? { variant: "neutral" as const, label: "已關閉" }
                : { variant: "warning" as const, label: "草稿" }
        : null;

    const uniqueResponses = useMemo(() => responses.filter((r) => !r.is_duplicate_attempt), [responses]);

    return (
        <>
            <div className="mb-4">
                <Link
                    href="/admin/forms"
                    className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 transition-colors hover:text-primary"
                >
                    <ArrowLeftIcon className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                    返回表單管理
                </Link>
            </div>

            <AdminPageHeader
                title={form?.title ?? "表單預覽與回覆"}
                subtitle={
                    form
                        ? `${statusBadge?.label ?? ""} · 共 ${uniqueResponses.length} 筆回覆${responses.length > uniqueResponses.length
                            ? `（含 ${responses.length - uniqueResponses.length} 筆重複）`
                            : ""
                        }`
                        : undefined
                }
                action={
                    form ? (
                        <Button
                            variant="ghost"
                            disabled={responses.length === 0}
                            onClick={() => {
                                if (responses.length === 0) {
                                    toast("目前沒有可匯出的回覆", "error");
                                    return;
                                }
                                exportCSV(form, responses);
                                toast("CSV 已下載", "success");
                            }}
                        >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            匯出 CSV
                        </Button>
                    ) : undefined
                }
            />

            <Card className="mt-6">
                <div className="border-b border-border px-5 py-4">
                    <h2 className="text-sm font-semibold text-neutral-950">表單預覽</h2>
                    {form?.description ? <p className="mt-1 text-[13px] text-neutral-500 whitespace-pre-wrap">{form.description}</p> : null}
                </div>
                <div className="space-y-3 px-5 py-4">
                    {sortedFields.length === 0 ? (
                        <p className="text-[13px] text-neutral-500">此表單尚未設定欄位。</p>
                    ) : (
                        sortedFields.map((field) =>
                            field.type === "section_header" ? (
                                <div key={field.id} className="border-b border-border pb-2 pt-2">
                                    <p className="text-[13px] font-semibold text-neutral-900">{field.label}</p>
                                </div>
                            ) : (
                                <div key={field.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-neutral-50 px-3 py-2">
                                    <div>
                                        <p className="text-[13px] font-medium text-neutral-900">
                                            {field.label}
                                            {field.required ? <span className="ml-1 text-red-500">*</span> : null}
                                        </p>
                                        <p className="text-[12px] text-neutral-500">{fieldTypeLabel(field.type)}</p>
                                    </div>
                                </div>
                            ),
                        )
                    )}
                </div>
            </Card>

            <Card className="mt-6">
                <div className="border-b border-border px-5 py-4">
                    <h2 className="text-sm font-semibold text-neutral-950">回覆列表</h2>
                </div>

                {loading ? (
                    <div className="overflow-hidden">
                        <AdminTableSkeleton rows={5} columns={[160, 120, 120, 100, 60]} />
                    </div>
                ) : error ? (
                    <AdminErrorState message={error} onRetry={fetchData} />
                ) : responses.length === 0 ? (
                    <AdminEmptyState message="尚無任何回覆" />
                ) : (
                    <AdminDataTable
                        data={responses}
                        columns={responseColumns}
                        getRowId={(row) => row.id}
                        emptyMessage="尚無任何回覆"
                        emptyColSpan={6}
                    />
                )}
            </Card>

            {selectedResponse && form && (
                <ResponseDetailPanel
                    response={selectedResponse}
                    fields={sortedFields}
                    onClose={() => setSelectedResponse(null)}
                />
            )}
        </>
    );
}
