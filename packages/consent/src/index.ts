export type Risk = 'low' | 'medium' | 'high';
export type Decision = 'allow' | 'deny' | 'ask';

export interface Action {
  skill: string;
  name: string;
  risk: Risk;
}

export interface AuditRecord {
  at: string;
  action: Action;
  decision: Decision;
  allowed: boolean;
  reason: string;
}

export type Prompter = (action: Action) => Promise<boolean>;

export interface Policy {
  /** Decision per risk level. Defaults: low=allow, medium=ask, high=ask. */
  byRisk?: Partial<Record<Risk, Decision>>;
  /** Per "skill" or "skill.name" overrides; most specific wins. */
  overrides?: Record<string, Decision>;
}

/**
 * Deny-by-default consent gate. "ask" decisions need a Prompter; with none
 * configured (or if it throws) the action is denied. Every check is audited.
 */
export class ConsentGate {
  private log: AuditRecord[] = [];

  constructor(private policy: Policy = {}, private prompter?: Prompter) {}

  decide(a: Action): Decision {
    const o = this.policy.overrides;
    const d = o?.[`${a.skill}.${a.name}`] ?? o?.[a.skill] ?? this.policy.byRisk?.[a.risk] ?? (a.risk === 'low' ? 'allow' : 'ask');
    return d;
  }

  async check(a: Action): Promise<boolean> {
    const decision = this.decide(a);
    let allowed = false;
    let reason = decision;
    if (decision === 'allow') allowed = true;
    else if (decision === 'ask') {
      if (!this.prompter) reason = 'ask: no prompter, denied';
      else {
        try {
          allowed = await this.prompter(a);
          reason = allowed ? 'user approved' : 'user declined';
        } catch {
          reason = 'prompter failed, denied';
        }
      }
    }
    this.log.push({ at: new Date().toISOString(), action: a, decision, allowed, reason });
    return allowed;
  }

  audit(): readonly AuditRecord[] {
    return this.log;
  }
}
