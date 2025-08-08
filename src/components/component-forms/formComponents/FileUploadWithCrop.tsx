import { displayAndDownloadFile} from '@/utils/helper';
import React, { useRef, useState, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import Image from 'next/image';

interface FileUploadWithCropProps {
  field: any;
  formValues: Record<string, any>;
  setFormValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  fieldErrors: Record<string, string>;
  setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  colors: any;
  handleBlur: (field: any) => void;
  isDisabled: boolean;
}

// Helper function to extract pure base64 data (remove the prefix)
const getPureBase64 = (base64String: string) => {
  return base64String.replace(/^data:.*?;base64,/, '');
};

const FileUploadWithCrop: React.FC<FileUploadWithCropProps> = ({
  field,
  formValues,
  setFormValues,
  fieldErrors,
  setFieldErrors,
  colors,
  handleBlur,
  isDisabled,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [fileType, setFileType] = useState<string>('');
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const acceptedTypes = field.FileType.split(',').map(ext => `.${ext.trim().toLowerCase()}`).join(',');
  const isRequired = field.isMandatory === "true"

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileType(file.type);
      setFileName(file.name);

      setFieldErrors(prev => ({ ...prev, [field.wKey]: `` }));

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.addEventListener('load', () => {
          setSrc(reader.result as string);
          setShowModal(true);
          setCrop(undefined);
        });
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const base64Data = getPureBase64(reader.result as string);
          setFormValues(prev => ({ 
            ...prev, 
            [field.wKey]: {
              data: base64Data,
              name: file.name,
              type: file.type
            }
          }));
          setCroppedImageUrl(base64Data);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const cropSize = Math.min(width, height) * 0.8;
    setCrop({
      unit: 'px',
      width: cropSize,
      height: cropSize,
      x: (width - cropSize) / 2,
      y: (height - cropSize) / 2,
    });
  }

  useEffect(() => {
    if (completedCrop?.width && completedCrop?.height && imgRef.current && previewCanvasRef.current) {
      generateCroppedImage();
    }
  }, [completedCrop]);

  const generateCroppedImage = async () => {
    if (!imgRef.current || !previewCanvasRef.current || !completedCrop) return;

    const canvas = previewCanvasRef.current;
    const image = imgRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelRatio = window.devicePixelRatio;

    canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio);

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';

    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;
    const cropWidth = completedCrop.width * scaleX;
    const cropHeight = completedCrop.height * scaleY;

    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    return new Promise<void>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.error('Canvas is empty');
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = getPureBase64(reader.result as string);
            setCroppedImageUrl(base64Data);
            setFormValues(prev => ({ 
              ...prev, 
              [field.wKey]: {
                data: base64Data,
                name: fileName,
                type: fileType
              }
            }));
            resolve();
          };
          reader.readAsDataURL(blob);
        },
        fileType || 'image/jpeg',
        0.9
      );
    });
  };

  const handleCropDone = async () => {
    if (croppedImageUrl) {
      setFormValues(prev => ({ 
        ...prev, 
        [field.wKey]: {
          data: croppedImageUrl,
          name: fileName,
          type: fileType
        }
      }));
      // Clear field error when crop is done
      setFieldErrors(prev => ({ ...prev, [field.wKey]: `` }));
    }
    setShowModal(false);
  };

  // Helper to get the current file data (supports both old and new formats)
  const getFileData = () => {
    const value = formValues[field.wKey];
    if (!value) return null;
    
    // New format (object with data and name)
    if (typeof value === 'object' && value.data) {
      return value;
    }
    // Old format (just base64 string)
    return {
      data: value,
      name: fileName || 'uploaded_file',
      type: fileType
    };
  };

  const currentFile = getFileData();

  // Function to reconstruct full base64 URL for display
  const getDisplayUrl = (base64Data: string, type: string) => {
    if (!base64Data) return '';
    return base64Data.startsWith('data:') ? base64Data : `data:${type};base64,${base64Data}`;
  };

  return (
    <div className="mb-1">
      <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
        {field.label}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="file"
        accept={acceptedTypes}
        onChange={onSelectFile}
        disabled={isDisabled}
        className="w-full px-3 py-1 border rounded-md"
        onBlur={() => handleBlur(field)}
      />

      {/* Preview section */}
      {currentFile && (
        <div className="mt-2">
          <p className="text-sm text-gray-600 mb-1">
            {currentFile.name}
          </p>
          
          {currentFile.type.startsWith('image/') ? (
            <Image
              src={getDisplayUrl(croppedImageUrl || currentFile.data, currentFile.type)}
              alt="Cropped Preview"
              width={150}
              height={150}
              style={{ maxWidth: 150, maxHeight: 150, objectFit: 'contain' }}
            />
          ) : (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                displayAndDownloadFile(currentFile.data);
              }}
              className="text-blue-500 underline"
            >
              View File
            </a>
          )}
        </div>
      )}

      {/* Hidden canvas for cropping */}
      <canvas
        ref={previewCanvasRef}
        style={{ display: 'none' }}
      />

      {fieldErrors[field.wKey] && (
        <span className="text-red-500 text-sm">{fieldErrors[field.wKey]}</span>
      )}

      {/* Cropping modal */}
      {showModal && src && (
        <div className="fixed inset-0 flex items-center justify-center z-[300]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white p-4 rounded shadow-lg max-w-lg w-full">
            <h2 className="text-lg font-semibold mb-2">Crop Image</h2>
            <ReactCrop
              crop={crop}
              onChange={c => setCrop(c)}
              onComplete={c => setCompletedCrop(c)}
              aspect={undefined}
              minWidth={100}
              minHeight={100}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                alt="Crop me"
                src={src}
                onLoad={onImageLoad}
                style={{ maxWidth: '100%', maxHeight: '70vh' }}
              />
            </ReactCrop>
            <div className="flex justify-end mt-4">
              <button
                className="px-4 py-2 bg-gray-300 rounded mr-2"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded"
                onClick={handleCropDone}
              >
                Crop & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadWithCrop;