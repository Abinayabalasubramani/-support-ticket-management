import { useState } from 'react';
import { useSelector } from 'react-redux';
import { UserPlus, Users } from 'lucide-react';
import { useGetUsersQuery } from '../api/apiSlice';
import { selectUser } from '../features/auth/authSlice';
import Avatar from '../components/common/Avatar';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Skeleton from '../components/common/Skeleton';
import AddMemberModal from '../components/team/AddMemberModal';

const ROLE_STYLES = {
  ADMIN: 'bg-primary-soft text-primary ring-primary/30',
  AGENT: 'bg-slate-500/15 text-slate-600 ring-slate-500/30 dark:text-slate-300',
};

export default function TeamPage() {
  const me = useSelector(selectUser);
  const { data: members, isLoading, isFetching, isError, error, refetch } = useGetUsersQuery();
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Users className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight text-fg">Team</h1>
            <p className="text-sm text-muted">The people who can sign in and be assigned tickets.</p>
          </div>
        </div>
        <button type="button" onClick={() => setAdding(true)} className="btn-primary">
          <UserPlus className="h-4 w-4" />
          Add team member
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading && (
          <div className="divide-y divide-line" aria-busy="true" aria-label="Loading team">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {isError && !members && <ErrorState error={error} onRetry={refetch} title="Could not load the team" />}

        {members && members.length === 0 && <EmptyState title="No team members yet" message='Use "Add team member" to create the first one.' />}

        {members && members.length > 0 && (
          <div className={`overflow-x-auto transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-line text-left text-sm font-medium text-muted">
                  <th scope="col" className="px-5 py-3.5">Member</th>
                  <th scope="col" className="px-4 py-3.5">Email</th>
                  <th scope="col" className="px-4 py-3.5">Role</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Assigned tickets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-surface-2/60">
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="inline-flex items-center gap-3 text-sm font-medium text-fg">
                        <Avatar name={member.name} size="h-9 w-9 text-xs" />
                        {member.name}
                        {member.id === me?.id && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-normal text-muted">you</span>}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-muted">{member.email}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${ROLE_STYLES[member.role]}`}>{member.role.toLowerCase()}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-fg">{member.assignedTickets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adding && <AddMemberModal onClose={() => setAdding(false)} />}
    </div>
  );
}
