/**
 * FramedAvatar — renders a user avatar with their active frame overlaid.
 * The frame image is absolutely positioned to cover the avatar.
 */
interface Props {
  src: string;
  activeFrame?: string;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export default function FramedAvatar({ src, activeFrame, size = 40, className = '', onClick }: Props) {
  const buildFrameUrl = (id: string) => {
    if (id.includes('.')) return encodeURI(`/src/avatar frame/${id}`);
    return encodeURI(`/src/avatar frame/Avatar Frame_${id}.png`);
  };

  return (
    <div
      className={`relative inline-block flex-shrink-0 rounded-full overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      <img
        src={src}
        alt="avatar"
        className="w-full h-full rounded-full object-cover"
      />
      {activeFrame && (
        <img
          src={buildFrameUrl(activeFrame)}
          alt="frame"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
    </div>
  );
}
