import type {
  AlertsCounts,
  NoShowAlert,
  OrderSignalAlert,
  StuckDocAlert,
} from "@/lib/services/dashboard-alerts.service"

import { AlertCountsCards } from "./alertas/alert-counts-cards"
import { NoShowList } from "./alertas/no-show-list"
import { SignalList } from "./alertas/signal-list"
import { StuckDocsList } from "./alertas/stuck-docs-list"

export type AlertasTabSnapshot = {
  counts: AlertsCounts
  orderSignals: OrderSignalAlert[]
  noShows: NoShowAlert[]
  stuckDocs: StuckDocAlert[]
}

export function AlertasTab({ snapshot }: { snapshot: AlertasTabSnapshot }) {
  return (
    <div className="space-y-6">
      <AlertCountsCards counts={snapshot.counts} />

      <SignalList alerts={snapshot.orderSignals} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NoShowList alerts={snapshot.noShows} />
        <StuckDocsList alerts={snapshot.stuckDocs} />
      </div>
    </div>
  )
}
