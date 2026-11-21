"""In-memory repository for dev/test (production refuses REPO_DRIVER=memory)."""

import threading

from app.domain.models import CallResult, Elder, Guardian, NineQTask, NotificationLog, Osm


class MemoryRepo:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self.osms: dict[str, Osm] = {}
        self.elders: dict[str, Elder] = {}
        self.guardians: dict[str, Guardian] = {}
        self.calls: dict[str, CallResult] = {}  # by call_id (globally unique, idempotency key)
        self.tasks: dict[str, NineQTask] = {}
        self.notifications: list[NotificationLog] = []

    def clear(self) -> None:
        with self._lock:
            self.__init__()  # type: ignore[misc]

    # OSM
    def get_osm(self, osm_id: str) -> Osm | None:
        o = self.osms.get(osm_id)
        return o.model_copy(deep=True) if o else None

    def _find_osm(self, **kw: str) -> Osm | None:
        ((field, value),) = kw.items()
        for o in self.osms.values():
            if getattr(o, field) == value:
                return o.model_copy(deep=True)
        return None

    def get_osm_by_phone(self, phone: str) -> Osm | None:
        return self._find_osm(phone=phone)

    def get_osm_by_referral(self, code: str) -> Osm | None:
        return self._find_osm(referral_code=code)

    def get_osm_by_link_code(self, code: str) -> Osm | None:
        return self._find_osm(line_link_code=code)

    def put_osm(self, osm: Osm) -> None:
        with self._lock:
            self.osms[osm.id] = osm.model_copy(deep=True)

    # Elders + guardians
    def get_elder(self, elder_id: str) -> Elder | None:
        e = self.elders.get(elder_id)
        return e.model_copy(deep=True) if e else None

    def list_elders_by_osm(self, osm_id: str) -> list[Elder]:
        return [e.model_copy(deep=True) for e in self.elders.values() if e.osm_id == osm_id]

    def create_registration(self, elder: Elder, guardian: Guardian) -> None:
        with self._lock:
            if elder.id in self.elders or guardian.id in self.guardians:
                raise ValueError("duplicate id")
            if guardian.line_link_code and self.get_guardian_by_link_code(guardian.line_link_code):
                raise ValueError("duplicate link code")
            self.elders[elder.id] = elder.model_copy(deep=True)
            self.guardians[guardian.id] = guardian.model_copy(deep=True)

    def list_guardians(self, elder_id: str) -> list[Guardian]:
        return [g.model_copy(deep=True) for g in self.guardians.values() if g.elder_id == elder_id]

    def get_guardian_by_link_code(self, code: str) -> Guardian | None:
        for g in self.guardians.values():
            if g.line_link_code == code:
                return g.model_copy(deep=True)
        return None

    def list_guardians_by_line_user(self, line_user_id: str) -> list[Guardian]:
        return [
            g.model_copy(deep=True)
            for g in self.guardians.values()
            if g.line_user_id == line_user_id
        ]

    def put_guardian(self, guardian: Guardian) -> None:
        with self._lock:
            self.guardians[guardian.id] = guardian.model_copy(deep=True)

    # Calls
    def call_exists(self, call_id: str) -> bool:
        return call_id in self.calls

    def put_call_if_absent(self, call: CallResult) -> bool:
        with self._lock:
            if call.id in self.calls:
                return False
            self.calls[call.id] = call.model_copy(deep=True)
            return True

    def get_call(self, elder_id: str, call_id: str) -> CallResult | None:
        c = self.calls.get(call_id)
        return c.model_copy(deep=True) if c and c.elder_id == elder_id else None

    def list_calls(self, elder_id: str, limit: int) -> list[CallResult]:
        mine = [c for c in self.calls.values() if c.elder_id == elder_id]
        mine.sort(key=lambda c: (c.started_at, c.id), reverse=True)
        return [c.model_copy(deep=True) for c in mine[:limit]]

    def put_call(self, call: CallResult) -> None:
        with self._lock:
            self.calls[call.id] = call.model_copy(deep=True)

    # 9Q tasks
    def list_open_tasks(self, elder_id: str) -> list[NineQTask]:
        return [
            t.model_copy(deep=True)
            for t in self.tasks.values()
            if t.elder_id == elder_id and t.status == "open"
        ]

    def list_open_tasks_by_osm(self, osm_id: str) -> list[NineQTask]:
        found = [t for t in self.tasks.values() if t.osm_id == osm_id and t.status == "open"]
        return [t.model_copy(deep=True) for t in sorted(found, key=lambda t: t.due_at)]

    def get_task(self, elder_id: str, task_id: str) -> NineQTask | None:
        t = self.tasks.get(task_id)
        return t.model_copy(deep=True) if t and t.elder_id == elder_id else None

    def put_task(self, task: NineQTask) -> None:
        with self._lock:
            self.tasks[task.id] = task.model_copy(deep=True)

    # Notifications
    def add_notification(self, log: NotificationLog) -> None:
        with self._lock:
            self.notifications.append(log)
