import { Button } from "@/components/ui/button";

interface AttachmentPreviewProps {
  fileUrl: string;
  contextTitle: string;
  className?: string;
}

const isImageFile = (fileName: string) =>
  /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName);

const AttachmentPreview = ({ fileUrl, contextTitle, className }: AttachmentPreviewProps) => {
  if (!fileUrl) return null;

  const fileName = decodeURIComponent(fileUrl.split("/").pop() || "attachment");
  const image = isImageFile(fileName);

  return (
    <div className={`rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3 ${className || ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{fileName}</p>
          <p className="text-xs text-muted-foreground">
            {image ? "Image attachment" : "Downloadable resource"}
          </p>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" download>
            Download
          </a>
        </Button>
      </div>
      {image && (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={fileUrl}
            alt={`Attachment for ${contextTitle}`}
            className="max-h-80 w-full rounded-xl object-cover border border-white/10"
            loading="lazy"
          />
        </a>
      )}
    </div>
  );
};

export default AttachmentPreview;

