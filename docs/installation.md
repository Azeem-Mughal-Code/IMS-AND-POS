# Installation & Setup

To run this application locally in a development environment:

### Prerequisites
*   Node.js (v16 or higher)
*   npm or yarn

### Steps

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/ims-pos-system.git
    cd ims-pos-system
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Start the development server:**
    ```bash
    npm start
    # or
    yarn start
    ```

4.  **Open in Browser:**
    The application will launch automatically at `http://localhost:3000`.

### Building for Production
To create an optimized build for deployment:
```bash
npm run build
```
The output will be in the `build/` folder, ready to be served by any static file server (Nginx, Apache, Vercel, Netlify).
