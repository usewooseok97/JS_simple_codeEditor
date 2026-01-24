# Vercel 배포 가이드 (AI 코드 분석기)

이 문서는 현재 프로젝트를 Vercel에 배포하는 과정을 안내합니다.

결론부터 말하면, 우리 프로젝트는 Vercel의 표준에 맞게 구성되어 있어 **별도의 코드 수정이 필요하지 않습니다.** 이 가이드는 Vercel 사이트에서 프로젝트를 생성하고 올바르게 설정하는 방법에 초점을 맞춥니다.

---

## 배포 절차

### 1단계: GitHub 저장소 준비

1.  **코드를 GitHub에 푸시(Push)합니다.**
    Vercel은 GitHub 저장소를 직접 가져와서 빌드 및 배포를 진행합니다. 로컬에 있는 코드를 GitHub에 먼저 업로드해야 합니다.

2.  **`.gitignore` 파일을 확인합니다.**
    이미 생성된 `.gitignore` 덕분에, 민감한 정보가 담긴 `.env` 파일이나 불필요한 `node_modules` 폴더는 GitHub에 올라가지 않습니다. 이는 보안을 위해 필수적인 단계입니다.

### 2단계: Vercel 프로젝트 생성

1.  [Vercel 공식 홈페이지](https://vercel.com/)로 이동하여 GitHub 계정으로 회원가입 또는 로그인합니다.

2.  로그인 후 대시보드에서 **'Add New...' -> 'Project'** 버튼을 클릭합니다.

3.  **'Import Git Repository'** 섹션에서 방금 코드를 푸시한 본인의 GitHub 저장소를 선택하고 **'Import'** 버튼을 누릅니다.

### 3단계: 프로젝트 설정 (가장 중요)

프로젝트를 Import하면 설정 화면으로 넘어갑니다.

1.  **Framework Preset**: Vercel이 자동으로 프레임워크를 감지하려고 하지만, 우리 프로젝트는 특정 프레임워크를 사용하지 않으므로 **'Other'**로 두면 됩니다.

2.  **Build and Output Settings**: 빌드 과정이 필요 없는 순수 HTML/CSS/JS 프로젝트이므로 이 부분은 수정할 필요 없이 기본값 그대로 둡니다.

3.  **Environment Variables (환경 변수)**: **가장 중요한 단계입니다.**
    *   설정 메뉴에서 'Environment Variables' 섹션을 찾아 펼칩니다.
    *   `api/analyze.js` 코드가 `process.env.GEMINI_API_KEY`를 통해 API 키를 읽을 수 있도록 Vercel 서버에 키를 알려주어야 합니다.
    *   다음과 같이 환경 변수를 추가합니다.
        *   **Name**: `GEMINI_API_KEY`
        *   **Value**: (Google AI Studio에서 발급받은 **실제 API 키**를 여기에 붙여넣습니다.)
    *   `Add` 버튼을 눌러 저장합니다.

![Vercel Environment Variable](https://vercel.com/docs/storage/vercel-storage-quickstart-images/environment-variables.png)

### 4단계: 배포 실행

모든 설정이 끝났습니다. 하단의 **'Deploy'** 버튼을 클릭합니다.

Vercel이 자동으로 GitHub 저장소에서 코드를 가져와 빌드하고, 전 세계 네트워크에 배포를 시작합니다. 몇 분 안에 배포가 완료되며, 완료 즉시 접속할 수 있는 공개 URL이 발급됩니다.

---

## 요약

- **코드 수정**: 필요 없음
- **핵심 과정**:
    1. GitHub 저장소에 프로젝트 업로드
    2. Vercel에서 해당 저장소 Import
    3. Vercel 프로젝트 설정에서 **`GEMINI_API_KEY` 환경 변수** 추가
    4. Deploy 버튼 클릭

이제 발급된 URL로 접속하여 AI 코드 분석 기능이 정상적으로 작동하는지 확인해 보세요.
