import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TrophyIcon } from "lucide-react";
import { getRank } from "@/api/statistic";
import type { StatisticRankItem } from "@shared/api";
import { Pagination } from "@/components/pagination";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const PAGE_SIZE = 20;
const RANK_DAYS = [1, 3, 7, 14, 30] as const;
type RankDays = (typeof RANK_DAYS)[number];

function fmtDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getOrgRankRange(
  now: Date,
  days: number,
): { start: string; end: string } {
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return { start: fmtDate(start), end: fmtDate(end) };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: number;
  scopeGroupId: number;
  scopeSquadId: number;
};

export function OrgRankSheet({
  open,
  onOpenChange,
  groupId,
  scopeGroupId,
  scopeSquadId,
}: Props) {
  const [days, setDays] = useState<RankDays>(7);
  const [scoreType, setScoreType] = useState<"ac" | "submit">("ac");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<StatisticRankItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const range = useMemo(() => getOrgRankRange(new Date(), days), [days]);

  useEffect(() => {
    if (!open) return;
    setDays(7);
    setScoreType("ac");
    setPage(1);
  }, [open]);

  useEffect(() => {
    if (!open || groupId <= 0) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    void getRank({
      startDate: range.start,
      endDate: range.end,
      scoreType,
      page,
      pageSize: PAGE_SIZE,
      groupId: scopeGroupId || groupId,
      squadId: scopeSquadId || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setLoading(false);
        if (!res.success || !res.data) {
          setList([]);
          setTotal(0);
          setError(res.message || "排行加载失败，请稍后重试");
          return;
        }
        setList(res.data.list);
        setTotal(res.data.total);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        setList([]);
        setTotal(0);
        setError("排行加载失败，请稍后重试");
      });
    return () => {
      cancelled = true;
    };
  }, [
    open,
    groupId,
    scopeGroupId,
    scopeSquadId,
    scoreType,
    page,
    range.start,
    range.end,
  ]);

  function changeDays(value: string) {
    const next = Number(value) as RankDays;
    if (!RANK_DAYS.includes(next)) return;
    setDays(next);
    setPage(1);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle className="flex items-center gap-2 pr-8 text-base">
            <TrophyIcon className="size-4 text-muted-foreground" />
            成员排行
          </SheetTitle>
          <SheetDescription className="flex flex-col gap-2">
            <span>
              {range.start} ~ {range.end}
              {total > 0 ? ` · 共 ${total} 人` : ""}
            </span>
            <div className="flex flex-wrap gap-2">
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={String(days)}
                onValueChange={changeDays}
              >
                {RANK_DAYS.map((value) => (
                  <ToggleGroupItem
                    key={value}
                    value={String(value)}
                    className="px-2 text-xs"
                  >
                    {value}日
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={scoreType}
                onValueChange={(value) => {
                  if (value === "ac" || value === "submit") {
                    setScoreType(value);
                    setPage(1);
                  }
                }}
              >
                <ToggleGroupItem value="ac" className="px-2 text-xs">
                  过题榜
                </ToggleGroupItem>
                <ToggleGroupItem value="submit" className="px-2 text-xs">
                  提交榜
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : error ? (
            <p role="alert" className="p-4 text-sm text-destructive">
              {error}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead className="text-right">
                    {scoreType === "ac" ? "过题" : "提交"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.userId}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {item.rank}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/profile?id=${item.userId}`}
                        onClick={() => onOpenChange(false)}
                        className="hover:underline"
                      >
                        {item.name || `用户${item.userId}`}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.score}
                    </TableCell>
                  </TableRow>
                ))}
                {!list.length && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      这段时间还没有排行数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
        {total > PAGE_SIZE && (
          <div className="border-t px-4 py-3">
            <Pagination
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={setPage}
              disabled={loading}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
