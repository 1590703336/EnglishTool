import { useState, useEffect, useRef } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import ReactPlayer from 'react-player';
import "./App.css";
import SrtParser2 from "srt-parser-2"; // 导入 srt-parser-2 以处理字幕文件的解析

function App() {
  // 定义各种状态变量来存储视频文件路径、字幕、当前播放时间、字幕索引、播放速度等
  const [videoUrl, setVideoUrl] = useState(""); // 用于存储视频文件路径
  const [subtitles, setSubtitles] = useState([]); // 用于存储解析后的字幕
  const [currentTime, setCurrentTime] = useState(0); // 用于存储当前播放时间
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState(0); // 用于存储当前字幕索引
  const [playbackRate, setPlaybackRate] = useState(1); // 用于存储播放速度
  const playerRef = useRef(null); // 使用 useRef 获取 ReactPlayer 的引用，便于直接控制播放器
  const [networkVideoUrl, setNetworkVideoUrl] = useState(""); // 用于存储网络视频链接
  const [isLocalVideo, setIsLocalVideo] = useState(false); // 用于存储是否为本地视频的状态
  const [isNetworkVideo, setIsNetworkVideo] = useState(false); // 用于存储是否为网络视频的状态

  // 处理字幕文件上传
  function handleSubtitleUpload(event) {
    const file = event.target.files[0]; // 获取文件对象
    if (file) {
      const reader = new FileReader(); // 创建 FileReader 实例以读取文件内容
      reader.onload = (e) => {
        const content = e.target.result; // 读取的文件内容
        const parser = new SrtParser2(); // 创建 SrtParser2 实例以解析字幕文件
        const parsedSubtitles = parser.fromSrt(content); // 使用 fromSrt 方法解析字幕内容
        setSubtitles(parsedSubtitles); // 更新状态，设置解析后的字幕
      };
      reader.readAsText(file); // 读取文件内容为文本
    }
  } 
  
  // 处理键盘事件的效果，例如切换字幕、调整播放速度等
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft') {
        // 切换到上一句字幕
        setCurrentSubtitleIndex((prevIndex) => {          
          const newIndex = Math.max(prevIndex - 1, 0); // 确保索引不小于 0
          const startTime = subtitles[newIndex - 1]?.startSeconds; // 获取上一句字幕的开始时间
          if (playerRef.current) {
            playerRef.current.seekTo(startTime, 'seconds'); // 跳转到上一句字幕的开始时间           
          }
          return newIndex;
        });
      } else if (event.key === 'ArrowRight') {
        // 切换到下一句字幕
        setCurrentSubtitleIndex((prevIndex) => {          
          const newIndex = Math.min(prevIndex + 1, subtitles.length - 1); // 确保索引不超过字幕长度
          const startTime = subtitles[newIndex - 1]?.startSeconds; // 获取下一句字幕的开始时间
          if (playerRef.current) {
            playerRef.current.seekTo(startTime, 'seconds'); // 跳转到下一句字幕的开始时间
          }
          return newIndex;
        });
      } else if (event.key === 'r') {
        // 重复播放当前句子
        if (subtitles.length > 0) {
          const startTime = subtitles[currentSubtitleIndex]?.startSeconds; // 获取当前字幕的开始时间
          if (playerRef.current) {
            playerRef.current.seekTo(startTime, 'seconds'); // 跳转到当前字幕的开始时间
          }
        }
      } else if (event.key === 'ArrowDown') {
        // 增加播放速度
        setPlaybackRate((prevRate) => Math.min(prevRate + 0.1, 2)); // 最大速度限制为2
      } else if (event.key === 'ArrowUp') {
        // 降低播放速度
        setPlaybackRate((prevRate) => Math.max(prevRate - 0.1, 0.5)); // 最小速度限制为0.5
      }
    };

    window.addEventListener('keydown', handleKeyDown); // 添加键盘事件监听器
    return () => {
      window.removeEventListener('keydown', handleKeyDown); // 组件卸载时移除事件监听器
    };
  }, [subtitles]); // 依赖于字幕的变化

  // 处理当前播放时间的变化来更新当前的字幕索引
  useEffect(() => {
    if (subtitles.length > 0) {
      const currentSubtitle = subtitles.findIndex(subtitle => {
        const startTime = subtitle.startSeconds;
        const endTime = subtitle.endSeconds;
        return currentTime >= startTime && currentTime <= endTime; // 找到当前播放时间对应的字幕
      });      
      if (currentSubtitle !== -1) {
        setCurrentSubtitleIndex(Number(subtitles[currentSubtitle].id)); // 更新当前字幕索引         
      }
    }
  }, [currentTime]); // 依赖于当前播放时间的变化

  const activeSubtitle = subtitles[currentSubtitleIndex]?.text || ''; // 获取当前活跃的字幕文本
 
  // 处理网络视频链接输入
  const handleNetworkVideoSubmit = (e) => {
    e.preventDefault(); // 阻止表单默认提交行为
    setVideoUrl(networkVideoUrl); // 设置视频链接
    setIsNetworkVideo(true); // 标记为网络视频
    setIsLocalVideo(false); // 标记不是本地视频
  };

  // 处理本地视频文件上传
  const handleLocalVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoUrl(URL.createObjectURL(file)); // 创建视频文件的 URL 并设置为视频路径
      setIsLocalVideo(true); // 标记为本地视频
      setIsNetworkVideo(false); // 标记不是网络视频
    }
  };

  // 重置到初始状态（主页）
  const resetToHome = () => {
    setVideoUrl(""); // 清空视频链接
    setSubtitles([]); // 清空字幕
    setIsLocalVideo(false); // 重置本地视频标记
    setIsNetworkVideo(false); // 重置网络视频标记
  };

  return (
    <main className="container">
      <div className="home-icon" onClick={resetToHome}>
        <img src={reactLogo} alt="Home" /> {/* 点击图标返回主页 */}
      </div>
      <div className="main-content">
        <div className="player-wrapper">
          <ReactPlayer
            ref={playerRef} // 绑定 playerRef 以控制播放器
            url={videoUrl} // 使用 videoUrl 状态
            width="100%"
            height="100%"
            controls={true} // 显示播放控制按钮
            onProgress={({ playedSeconds }) => setCurrentTime(playedSeconds)} // 更新当前播放时间
            playing={true} // 确保视频在切换时播放
            progressInterval={100} // 每 100 毫秒更新进度
            playbackRate={playbackRate} // 设置播放速度
          />
          <div className="subtitle-overlay">
            <p style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
              <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>{activeSubtitle}</span> {/* 居中显示当前字幕 */}
              <span style={{ marginLeft: '3px', marginRight: '3px', position: 'absolute', right: '0' }}>{playbackRate.toFixed(1)}</span> {/* 显示当前播放速度 */}
            </p>
          </div>
        </div>
        
        {/* 当既不是本地视频也不是网络视频时，显示视频输入选项 */}
        {!isLocalVideo && !isNetworkVideo && (
          <>
            <form onSubmit={handleNetworkVideoSubmit}>
              <input
                type="text"
                value={networkVideoUrl}
                onChange={(e) => setNetworkVideoUrl(e.target.value)}
                placeholder="输入网络视频链接" // 提示用户输入网络视频链接
              />
              <button type="submit">加载网络视频</button>
            </form>

            <div className="file-input-wrapper">
              <label htmlFor="local-video-input">选择本地视频文件：</label>
              <input
                id="local-video-input"
                type="file"
                accept="video/*"
                onChange={handleLocalVideoUpload}
              />
            </div>
          </>
        )}
        
        {/* 如果是本地视频，显示字幕文件输入选项 */}
        {isLocalVideo && (
          <div className="file-input-wrapper">
            <label htmlFor="subtitle-input">选择字幕文件：</label>
            <input
              id="subtitle-input"
              type="file"
              accept=".srt,.vtt"
              onChange={handleSubtitleUpload}
            />
          </div>
        )}
      </div>
      
      {/* 显示字幕列表并使当前字幕自动滚动到可视范围内 */}
      <div className="subtitles" style={{ scrollPaddingTop: 'calc(3 * 1.5em)' }}>
        {subtitles.map((subtitle, index) => {
          const isActive = currentSubtitleIndex == Number(subtitle.id); // 判断当前字幕是否为活跃字幕
          return (
            <div
              key={index}
              className={isActive ? 'active-subtitle' : ''} // 如果是活跃字幕，则应用高亮样式
              ref={isActive ? (el) => el && el.scrollIntoView({ behavior: 'smooth', block: 'start' }) : null} // 自动滚动到当前活跃字幕
              style={{ marginTop: index === 0 ? 'calc(3 * 1.5em)' : '0' }} // 为第一个元素添加额外的顶部间距
            >
              <p>{subtitle.id}  {subtitle.startSeconds} - {subtitle.text}</p> {/* 显示字幕的 ID、开始时间和文本内容 */}
            </div>
          );
        })}
      </div>
    </main>
  );
}

export default App;