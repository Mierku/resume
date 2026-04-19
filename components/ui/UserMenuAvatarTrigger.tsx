"use client";

interface UserMenuAvatarTriggerProps {
  avatarUrl: string;
  displayName: string;
  expanded: boolean;
  onToggle: () => void;
  buttonClassName: string;
  avatarOrbitClassName: string;
  avatarClassName: string;
  ariaLabel?: string;
}

export function UserMenuAvatarTrigger({
  avatarUrl,
  displayName,
  expanded,
  onToggle,
  buttonClassName,
  avatarOrbitClassName,
  avatarClassName,
  ariaLabel = "打开用户导航菜单",
}: UserMenuAvatarTriggerProps) {
  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={onToggle}
      aria-expanded={expanded}
      aria-haspopup="menu"
      aria-label={ariaLabel}
    >
      <span className={avatarOrbitClassName}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={`${displayName}头像`}
          className={avatarClassName}
          loading="lazy"
        />
      </span>
    </button>
  );
}
