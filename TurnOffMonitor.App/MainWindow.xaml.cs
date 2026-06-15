using Microsoft.Web.WebView2.Core;
using System.Diagnostics;
using System.IO;
using System.Windows;
using System.Windows.Forms;

namespace TurnOffMonitor.App;

public partial class MainWindow : Window
{
    private Process? _backendProcess;
    private NotifyIcon? _notifyIcon;
    private bool _forceClose = false;

    public MainWindow()
    {
        InitializeComponent();
        InitializeTray();
        StartBackend();
        InitializeWebView();
    }

    private void InitializeTray()
    {
        _notifyIcon = new NotifyIcon
        {
            Icon = new System.Drawing.Icon(
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "turnoffmonitor_retrowave_v4.ico")),
            Visible = true,
            Text = "TurnOff Monitor"
        };

        var menu = new ContextMenuStrip();
        menu.Items.Add("Abrir", null, (s, e) => ShowWindow());
        menu.Items.Add("Cerrar", null, (s, e) => ForceClose());
        _notifyIcon.ContextMenuStrip = menu;
        _notifyIcon.DoubleClick += (s, e) => ShowWindow();
    }

    [System.Runtime.InteropServices.DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    private void StartBackend()
    {
        var backendPath = Path.Combine(
            AppDomain.CurrentDomain.BaseDirectory,
            "TurnOffMonitor.API.exe"
        );

        if (!File.Exists(backendPath))
        {
            System.Windows.MessageBox.Show(
                $"No se encontró el backend en:\n{backendPath}",
                "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            return;
        }

        _backendProcess = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = backendPath,
                UseShellExecute = false,
                CreateNoWindow = true
            }
        };
        _backendProcess.Start();

        // Esperar que el proceso inicie y ocultar su ventana
        Task.Delay(1000).ContinueWith(_ =>
        {
            try
            {
                _backendProcess.Refresh();
                if (_backendProcess.MainWindowHandle != IntPtr.Zero)
                    ShowWindow(_backendProcess.MainWindowHandle, 0);
            }
            catch { }
        });
    }

    private async void InitializeWebView()
    {
        await WebView.EnsureCoreWebView2Async();
        WebView.CoreWebView2.Settings.AreDevToolsEnabled = false;
        WebView.CoreWebView2.Settings.IsStatusBarEnabled = false;
        WebView.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = false;

        var handler = new System.Net.Http.HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (_, _, _, _) => true
        };
        using var http = new System.Net.Http.HttpClient(handler);

        bool backendReady = false;
        string[] urls = { "https://localhost:7151/api/monitor/status", "http://localhost:5000/api/monitor/status" };

        for (int i = 0; i < 15; i++)
        {
            await Task.Delay(2000);
            foreach (var url in urls)
            {
                try
                {
                    var response = await http.GetAsync(url);
                    if (response.IsSuccessStatusCode)
                    {
                        backendReady = true;
                        var baseUrl = url.Replace("/api/monitor/status", "");
                        WebView.Source = new Uri(baseUrl);
                        return;
                    }
                }
                catch { }
            }
        }

        if (!backendReady)
            System.Windows.MessageBox.Show("El backend no respondió a tiempo.", "Error", MessageBoxButton.OK, MessageBoxImage.Warning);
    }

    private void ShowWindow()
    {
        Show();
        WindowState = WindowState.Normal;
        Activate();
    }

    private void ForceClose()
    {
        _forceClose = true;
        Close();
    }

    protected override void OnStateChanged(EventArgs e)
    {
        if (WindowState == WindowState.Minimized)
            Hide();
        base.OnStateChanged(e);
    }

    private void Window_Closing(object sender, System.ComponentModel.CancelEventArgs e)
    {
        var result = System.Windows.MessageBox.Show(
            "Se detendrá el monitoreo y se cerrará TurnOff Monitor.\n¿Deseas continuar?",
            "Cerrar TurnOff Monitor",
            MessageBoxButton.YesNo,
            MessageBoxImage.Question
        );

        if (result == MessageBoxResult.No)
        {
            e.Cancel = true;
            return;
        }

        _notifyIcon?.Dispose();

        if (_backendProcess != null && !_backendProcess.HasExited)
        {
            _backendProcess.Kill();
            _backendProcess.Dispose();
        }
    }
}