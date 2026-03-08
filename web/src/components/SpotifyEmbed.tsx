"use client";

type Props = {
  trackId: string;
};

export default function SpotifyEmbed({ trackId }: Props) {
  return (
    <div className="mt-6 overflow-hidden rounded-xl">
      <iframe
        src={`https://open.spotify.com/embed/track/${trackId}?theme=0`}
        width="100%"
        height="152"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        style={{ borderRadius: 12, border: 0 }}
        title="Spotify player"
      />
    </div>
  );
}
