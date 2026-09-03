import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';
import { RotateCw, AlertTriangle, Play, Pause, Footprints } from 'lucide-react';
import clsx from 'clsx';

/**
 * Hard invariant: At most ONE McView3D iframe mounted.
 * Tracks global mounted instances to prevent memory leaks and WebGL crashes.
 */
let activeViewerInstanceCount = 0;

const McView3DViewer = ({
  username,
  animation = 'idle',
  onAnimationChange,
  className = '',
}) => {
  const [viewerStatus, setViewerStatus] = useState('loading'); // 'loading' | 'ready' | 'timed_out' | 'error'
  const [currentAnim, setCurrentAnim] = useState(animation);
  const [retryKey, setRetryKey] = useState(0);
  const iframeRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    activeViewerInstanceCount++;
    if (activeViewerInstanceCount > 1) {
      console.warn(`[McView3D] Invariant violation warning: ${activeViewerInstanceCount} instances mounted.`);
    }

    return () => {
      activeViewerInstanceCount = Math.max(0, activeViewerInstanceCount - 1);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Update animation from prop if controlled
  useEffect(() => {
    setCurrentAnim(animation);
  }, [animation]);

  // Handle loading timeout (5 seconds)
  useEffect(() => {
    setViewerStatus('loading');
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      // If still loading after 5s, provide fallback
      setViewerStatus((prev) => (prev === 'loading' ? 'timed_out' : prev));
    }, 5000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [username, currentAnim, retryKey]);

  const handleIframeLoad = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setViewerStatus('ready');
  };

  const handleRetry = () => {
    setRetryKey((k) => k + 1);
  };

  const handleSelectAnimation = (anim) => {
    setCurrentAnim(anim);
    if (onAnimationChange) {
      onAnimationChange(anim);
    }
  };

  // Construct official McView3D embed URL
  const encodedName = encodeURIComponent(username || 'Steve');
  const embedUrl = `https://kurojs.github.io/McView3D/embed.html?skin=${encodedName}&width=380&height=380&animation=${currentAnim}&cape=none`;

  return (
    <div className={clsx('flex flex-col items-center gap-3 w-full', className)}>
      {/* 3D Canvas / Frame Container */}
      <div className="relative w-full aspect-square max-w-[380px] max-h-[380px] rounded-2xl bg-s1 border-2 border-s3 overflow-hidden shadow-2xl flex items-center justify-center group">
        {/* Ambient background glow */}
        <div className="absolute inset-0 bg-radial from-p1/10 via-transparent to-transparent pointer-events-none" />

        {/* Loading Spinner */}
        {viewerStatus === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-s1/90 backdrop-blur-sm z-10">
            <img src="/images/icons/Loader2.gif" alt="Loading" className="size-8 object-contain" />
            <span className="text-xs font-mono text-p5">Rendering 3D skin...</span>
          </div>
        )}

        {/* Timed out or Error Fallback */}
        {(viewerStatus === 'timed_out' || viewerStatus === 'error') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 gap-3 bg-s1/95 z-20 text-center">
            <img
              src={`https://mc-heads.net/body/${encodedName}/128`}
              alt={username}
              className="size-24 object-contain drop-shadow-md rounded-lg"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
              <BreezeIcon icon={AlertTriangle} size={15} />
              <span>3D Preview Unavailable</span>
            </div>
            <p className="text-[11px] text-p5 max-w-[240px]">
              External skin viewer could not be loaded or took too long to render.
            </p>
            <BreezeButton
              variant="secondary"
              size="xs"
              icon={RotateCw}
              onClick={handleRetry}
            >
              Retry 3D Render
            </BreezeButton>
          </div>
        )}

        {/* Active McView3D Iframe */}
        <iframe
          key={`${username}-${currentAnim}-${retryKey}`}
          ref={iframeRef}
          src={embedUrl}
          title={`3D Minecraft Skin Viewer for ${username}`}
          onLoad={handleIframeLoad}
          onError={() => setViewerStatus('error')}
          className="w-full h-full border-0 relative z-0"
          sandbox="allow-scripts allow-same-origin"
          loading="eager"
        />
      </div>

      {/* Animation Control Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-s1 rounded-xl border border-s3 shadow-inner">
        <button
          type="button"
          onClick={() => handleSelectAnimation('idle')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200',
            currentAnim === 'idle'
              ? 'bg-s4/30 text-p1 border border-s4/50 shadow-sm'
              : 'text-p5 hover:text-p4'
          )}
        >
          <BreezeIcon icon={Pause} size={12} />
          <span>Idle</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectAnimation('walk')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200',
            currentAnim === 'walk'
              ? 'bg-s4/30 text-p1 border border-s4/50 shadow-sm'
              : 'text-p5 hover:text-p4'
          )}
        >
          <BreezeIcon icon={Footprints} size={12} />
          <span>Walk</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectAnimation('run')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200',
            currentAnim === 'run'
              ? 'bg-s4/30 text-p1 border border-s4/50 shadow-sm'
              : 'text-p5 hover:text-p4'
          )}
        >
          <BreezeIcon icon={Play} size={12} />
          <span>Run</span>
        </button>
      </div>
    </div>
  );
};

McView3DViewer.propTypes = {
  username: PropTypes.string.isRequired,
  animation: PropTypes.oneOf(['idle', 'walk', 'run']),
  onAnimationChange: PropTypes.func,
  className: PropTypes.string,
};

export default McView3DViewer;
