import { Button } from "@/components/ui/button";

interface AttachmentPreviewProps {
  fileUrl: string;
  contextTitle: string;
  className?: string;
  isAccessible?: boolean;
  onRequestAccess?: () => void;
}

const isImageFile = (fileName: string) =>
  /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName);

const AttachmentPreview = ({
  fileUrl,
  contextTitle,
  className,
  isAccessible = true,
  onRequestAccess,
}: AttachmentPreviewProps) => {
  if (!fileUrl) return null;

  const fileName = decodeURIComponent(fileUrl.split("/").pop() || "attachment");
  const image = isImageFile(fileName);

  const handleRequestAccess = () => {
    onRequestAccess?.();
  };

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3 ${className || ""} ${
        !isAccessible ? "relative overflow-hidden" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{fileName}</p>
          <p className="text-xs text-muted-foreground">
            {image ? "Image attachment" : "Downloadable resource"}
          </p>
        </div>
        {isAccessible ? (
          <Button variant="secondary" size="sm" asChild>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" download>
              Download
            </a>
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={handleRequestAccess}>
            Sign in to download
          </Button>
        )}
      </div>
      {image && (
        <div className="relative">
          <img
            src={fileUrl}
            alt={`Attachment for ${contextTitle}`}
            className={`max-h-80 w-full rounded-xl object-cover border border-white/10 ${
              !isAccessible ? "blur-sm brightness-75 pointer-events-none select-none" : ""
            }`}
            loading="lazy"
          />
          {!isAccessible && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm font-semibold text-white">Sign in to preview this file</p>
              <Button variant="secondary" size="sm" onClick={handleRequestAccess}>
                Sign in
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttachmentPreview;

