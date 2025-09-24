import { useState, useRef, useEffect, useCallback } from "react";

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  original_file_name: string;
}

interface PDFEditorProps {
  document: Document;
  clientId: string;
  onSave: () => void;
  onCancel: () => void;
}

const PDFEditor = ({ document, clientId, onSave, onCancel }: PDFEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTool, setActiveTool] = useState<"select" | "text" | "draw">("select");
  const [textColor, setTextColor] = useState("#000000");
  const [textSize, setTextSize] = useState(16);
  const [drawColor, setDrawColor] = useState("#000000");
  const [drawWidth, setDrawWidth] = useState(2);
  const [fileName, setFileName] = useState(document.file_name);
  const [loading, setLoading] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [textObjects, setTextObjects] = useState<Array<{
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
  }>>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Função para mostrar toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({message, type});
    setTimeout(() => setToast(null), 3000);
  };

  // Função para calcular dimensões responsivas do canvas
  const getCanvasDimensions = useCallback(() => {
    if (!containerRef.current) return { width: 800, height: 600 };
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth - 32; // padding
    const isMobile = window.innerWidth < 768;
    
    return {
      width: Math.min(containerWidth, isMobile ? 350 : 800),
      height: isMobile ? 500 : 600
    };
  }, []);

  // Inicialização do canvas
  const initializeCanvas = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dimensions = getCanvasDimensions();
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // Configurar canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setContext(ctx);
  }, [getCanvasDimensions]);

  // Efeito para inicializar canvas
  useEffect(() => {
    const timer = setTimeout(() => {
      initializeCanvas();
    }, 100);

    return () => clearTimeout(timer);
  }, [initializeCanvas]);

  // Redraw canvas
  const redrawCanvas = useCallback(() => {
    if (!context || !canvasRef.current) return;

    const canvas = canvasRef.current;
    
    // Limpar canvas
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Desenhar texto de página
    context.fillStyle = '#666666';
    context.font = '20px Arial';
    context.fillText(`PDF Página ${currentPage + 1}`, 50, 50);

    // Desenhar textos adicionados
    textObjects.forEach(textObj => {
      context.fillStyle = textObj.color;
      context.font = `${textObj.fontSize}px Arial`;
      context.fillText(textObj.text, textObj.x, textObj.y);
    });
  }, [context, currentPage, textObjects]);

  // Efeito para redraw quando textObjects mudam
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Handlers para desenho
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "draw" || !context || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    context.beginPath();
    context.moveTo(x, y);
    context.strokeStyle = drawColor;
    context.lineWidth = drawWidth;
    context.lineCap = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool !== "draw" || !context || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Handler para adicionar texto
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "text" || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newTextId = Date.now().toString();
    setTextObjects(prev => [...prev, {
      id: newTextId,
      text: "Clique para editar",
      x,
      y,
      fontSize: textSize,
      color: textColor
    }]);
    
    setEditingTextId(newTextId);
    setTextInput("Clique para editar");
  };

  // Adicionar texto programaticamente
  const addText = () => {
    const newTextId = Date.now().toString();
    setTextObjects(prev => [...prev, {
      id: newTextId,
      text: "Novo texto",
      x: 100,
      y: 100,
      fontSize: textSize,
      color: textColor
    }]);
    
    setEditingTextId(newTextId);
    setTextInput("Novo texto");
  };

  // Salvar texto editado
  const saveEditingText = () => {
    if (!editingTextId) return;

    setTextObjects(prev => prev.map(textObj => 
      textObj.id === editingTextId 
        ? { ...textObj, text: textInput }
        : textObj
    ));

    setEditingTextId(null);
    setTextInput("");
  };

  // Cancelar edição de texto
  const cancelEditingText = () => {
    setEditingTextId(null);
    setTextInput("");
  };

  const clearCanvas = () => {
    setTextObjects([]);
    redrawCanvas();
  };

  const loadPage = (pageIndex: number) => {
    setCurrentPage(pageIndex);
    // Limpar objetos da página anterior
    setTextObjects([]);
  };

  const savePDF = async () => {
    setLoading(true);
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showToast("Documento salvo com sucesso", "success");
      onSave();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      showToast("Erro ao salvar documento", "error");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      // Simular download
      if (!canvasRef.current) return;
      
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
      
      showToast("Download iniciado", "success");
    } catch (error) {
      console.error("Erro ao fazer download:", error);
      showToast("Erro ao fazer download", "error");
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 p-4 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Editor de texto modal */}
      {editingTextId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Editar Texto</h3>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="w-full p-2 border rounded mb-4"
              placeholder="Digite o texto"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={cancelEditingText}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveEditingText}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar - Responsivo */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border-b bg-white rounded-lg shadow-sm space-y-4 md:space-y-0">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 md:flex-none">
            <label htmlFor="fileName" className="block text-sm font-medium mb-1">Nome do Arquivo</label>
            <input
              id="fileName"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full md:w-48 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={`px-3 py-2 rounded text-sm ${
                activeTool === "select" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => setActiveTool("select")}
            >
              Selecionar
            </button>
            <button
              className={`px-3 py-2 rounded text-sm flex items-center ${
                activeTool === "text" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => setActiveTool("text")}
            >
              <span className="mr-1">T</span>
              Texto
            </button>
            <button
              className={`px-3 py-2 rounded text-sm flex items-center ${
                activeTool === "draw" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => setActiveTool("draw")}
            >
              <span className="mr-1">✏️</span>
              Desenhar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            className="px-3 py-2 border rounded text-sm hover:bg-gray-50"
            onClick={clearCanvas}
          >
            🗑️
          </button>
          <button 
            className="px-3 py-2 border rounded text-sm hover:bg-gray-50"
            onClick={downloadPDF}
          >
            ⬇️
          </button>
          <button 
            className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
            onClick={savePDF} 
            disabled={loading}
          >
            {loading ? "Salvando..." : "💾 Salvar"}
          </button>
          <button 
            className="px-3 py-2 border rounded text-sm hover:bg-gray-50"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 space-y-4 lg:space-y-0 lg:space-x-4">
        {/* Tools Panel - Responsivo */}
        <div className="w-full lg:w-64 order-2 lg:order-1">
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
            {activeTool === "text" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Tamanho da Fonte</label>
                  <select 
                    value={textSize} 
                    onChange={(e) => setTextSize(parseInt(e.target.value))}
                    className="w-full p-2 border rounded"
                  >
                    <option value={12}>12px</option>
                    <option value={14}>14px</option>
                    <option value={16}>16px</option>
                    <option value={18}>18px</option>
                    <option value={20}>20px</option>
                    <option value={24}>24px</option>
                    <option value={32}>32px</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cor do Texto</label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-full h-10 border rounded"
                  />
                </div>
                <button 
                  onClick={addText} 
                  className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                >
                  Adicionar Texto
                </button>
              </>
            )}

            {activeTool === "draw" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Largura do Traço</label>
                  <select 
                    value={drawWidth} 
                    onChange={(e) => setDrawWidth(parseInt(e.target.value))}
                    className="w-full p-2 border rounded"
                  >
                    <option value={1}>1px</option>
                    <option value={2}>2px</option>
                    <option value={3}>3px</option>
                    <option value={5}>5px</option>
                    <option value={8}>8px</option>
                    <option value={12}>12px</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cor do Traço</label>
                  <input
                    type="color"
                    value={drawColor}
                    onChange={(e) => setDrawColor(e.target.value)}
                    className="w-full h-10 border rounded"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Canvas Area - Responsivo */}
        <div className="flex-1 order-1 lg:order-2">
          <div className="bg-white rounded-lg shadow-sm p-4" ref={containerRef}>
            {/* Page Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                disabled={currentPage === 0}
                onClick={() => loadPage(currentPage - 1)}
              >
                Anterior
              </button>
              <span className="text-sm text-gray-600">
                Página {currentPage + 1} de {totalPages}
              </span>
              <button
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                disabled={currentPage === totalPages - 1}
                onClick={() => loadPage(currentPage + 1)}
              >
                Próxima
              </button>
            </div>

            <hr className="mb-4" />

            {/* Canvas Container */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex justify-center">
                <canvas 
                  ref={canvasRef} 
                  className="max-w-full cursor-crosshair"
                  style={{ touchAction: 'none' }}
                  onClick={handleCanvasClick}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFEditor;