const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

code = code.replace(
  `    if (suggestedTurma) {
      setAssociationType('turma');
      setAssociationId(suggestedTurma.id);
    } else if (suggestedPartner) {
      setAssociationType('partner');
      setAssociationId(suggestedPartner.id);
    } else {
      setAssociationType('turma');`,
  `    if (suggestedTurma) {
      setAssociationType('tapi');
      setAssociationId(suggestedTurma.id);
    } else if (suggestedPartner) {
      setAssociationType('termo');
      setAssociationId(suggestedPartner.id);
    } else {
      setAssociationType('tapi');`
);

// Add caching for state
const cacheDecl = `// In-memory module-level cache for Google OAuth token
let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;

let searchStateCache: any = null;
`;

code = code.replace(
  `// In-memory module-level cache for Google OAuth token
let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;`,
  cacheDecl
);

const stateHooks = `  // Scan & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [folderId, setFolderId] = useState('');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // AI Analysis states
  const [analyzingFileId, setAnalyzingFileId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Link / Association states
  const [associationType, setAssociationType] = useState<'tapi' | 'termo' | null>(null);
  const [associationId, setAssociationId] = useState<string>('');
  const [isLinkedSuccess, setIsLinkedSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'search' | 'report'>('search');
  const [isFolderBrowserOpen, setIsFolderBrowserOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [isDriveSelected, setIsDriveSelected] = useState(false);
  const [driveIdSelected, setDriveIdSelected] = useState<string | null>(null);`;

const newStateHooks = `  // Scan & Search states
  const [searchQuery, setSearchQuery] = useState(searchStateCache?.searchQuery || '');
  const [folderId, setFolderId] = useState(searchStateCache?.folderId || '');
  const [files, setFiles] = useState<DriveFile[]>(searchStateCache?.files || []);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // AI Analysis states
  const [analyzingFileId, setAnalyzingFileId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(searchStateCache?.selectedFile || null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(searchStateCache?.analysisResult || null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Link / Association states
  const [associationType, setAssociationType] = useState<'tapi' | 'termo' | null>(searchStateCache?.associationType || null);
  const [associationId, setAssociationId] = useState<string>(searchStateCache?.associationId || '');
  const [isLinkedSuccess, setIsLinkedSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'search' | 'report'>(searchStateCache?.viewMode || 'search');
  const [isFolderBrowserOpen, setIsFolderBrowserOpen] = useState(false);
  const [folderName, setFolderName] = useState(searchStateCache?.folderName || '');
  const [isDriveSelected, setIsDriveSelected] = useState(searchStateCache?.isDriveSelected || false);
  const [driveIdSelected, setDriveIdSelected] = useState<string | null>(searchStateCache?.driveIdSelected || null);

  useEffect(() => {
    searchStateCache = {
      searchQuery,
      folderId,
      files,
      selectedFile,
      analysisResult,
      associationType,
      associationId,
      viewMode,
      folderName,
      isDriveSelected,
      driveIdSelected
    };
  }, [searchQuery, folderId, files, selectedFile, analysisResult, associationType, associationId, viewMode, folderName, isDriveSelected, driveIdSelected]);`;

code = code.replace(stateHooks, newStateHooks);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
