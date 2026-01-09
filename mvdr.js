/* =========================================================
   BASIC NAVIGATION
========================================================= */
function goLMS() {
  window.location.href = "index.html";
}

function goMVDR() {
  window.location.href = "mvdr.html";
}

/* =========================================================
   SLIDER ↔ INPUT SYNC
========================================================= */
document.addEventListener("DOMContentLoaded", () => {

  const pairs = [
    ["N", "N_val"],
    ["theta_s", "theta_s_val"],
    ["theta_i", "theta_i_val"],
    ["ss", "ss_val"],
    ["snr", "snr_val"],
    ["inr", "inr_val"],
    ["runs", "runs_val"]
  ];

  pairs.forEach(([sId, tId]) => {
    const s = document.getElementById(sId);
    const t = document.getElementById(tId);
    if (!s || !t) return;

    s.addEventListener("input", () => t.value = s.value);
    t.addEventListener("input", () => s.value = t.value);
  });

});

/* =========================================================
   GENERATE MATLAB CODE (EXACT MATCH)
========================================================= */
function generateCode() {

  const N     = document.getElementById("N").value;
  const ts    = document.getElementById("theta_s").value;
  const ti    = document.getElementById("theta_i").value;
  const ss    = document.getElementById("ss").value;
  const snr   = document.getElementById("snr").value;
  const inr   = document.getElementById("inr").value;
  const runs  = document.getElementById("runs").value;

  const code = `
    function mvdr_beamformer_with_monte_carlo(N, theta_s, theta_i, ss, snr, num_runs)
    j = sqrt(-1); % Defining complex iota
    source = 1; % Number of signal sources
    interference = 1; % Number of interferences
    % Initialize results storage
    G_dB_all = zeros(num_runs, 180);

    % Monte Carlo runs
    for run = 1:num_runs
        %% Adding the channel to the transmitted signal
        for m = 1:(source + interference)
            S(m, :) = 10.^(snr(m)/10)*(randn(1, ss) + j*randn(1, ss)); % Signal and interference
        end

        %% Defining the DOA vectors for interference and transmitted Signal
        A_i = exp(-j*pi*(0:N-1)'*sin(theta_i/180*pi)); % DOA matrix for interference
        A_s = exp(-j*pi*(0:N-1)'*sin(theta_s*pi/180)); % DOA matrix for signal
        A = [A_s A_i(:,1:interference)]; % DOA matrix

        %% Defining AWGN noise at the receiver
        n = randn(N, ss) + j*randn(N, ss); % Random noise

        %% Received Signal before MVDR beamforming
        X = A*S + n; % Received Signal

        %% MVDR beamforming 
        Wx = A_s' .* 2^10; % Initializing the beamformed vector
        u = 2^(-31) * 2^16; % Constant term
        B0H_B0 = eye(N);
        B0H_B0(1,1) = 0;
        dataout = zeros(1, ss); % Initializing the output data signal whose SNR will be calculated
        dataout(1,1) = Wx * X(:,1) ./ 2^14;

        %% LMS Algorithm 
        for i = 1:length(dataout)-1 
            Wx = Wx - u * (X(:,i)') * B0H_B0 * dataout(1,i); % LMS Algorithm Iterations
            dataout(1,i+1) = Wx * X(:,i+1) ./ 2^15;
        end

        %% Plotting the graph 
        phi = -89:1:90; % Different angles for plotting SNR
        a = exp(-j*pi*(0:N-1)'*sin(phi*pi/180));
        F = Wx * a; % Final beamformed vector

        G = abs(F).^2 ./ max(abs(F).^2); % MVDR beamformed vector SNR
        G_dB = 10*log10(G); % MVDR beamformed vector SNR in dB

        % Store result of this run
        G_dB_all(run, :) = G_dB;
    end

    % Average over all Monte Carlo runs
    G_dB_avg = mean(G_dB_all, 1);

    % Plot averaged result
    figure();
    plot(phi, G_dB_avg, 'linewidth', 2);
    legend('d=\lambda/2');
    xlabel('Angle (\circ)');
    ylabel('Magnitude (dB)');
    title('MVDR Beamformed Output with Monte Carlo Runs');
    grid on;
end

% Parameters
N = ${N};// Array number of antennas
theta_s = ${ts};// DOA of signal
theta_i = ${ti}; // DOA of interference
ss = ${ss};// Number of snapshots
snr = [${snr} ${inr}];// SNR and INR values
num_runs = ${runs};// Number of Monte Carlo runs
// Call the function
mvdr_beamformer_with_monte_carlo(N,theta_s,theta_i,ss,snr,num_runs);
`;

  document.getElementById("codeBox").value = code.trim();
}

/* =========================================================
   DOWNLOAD CODE
========================================================= */
function downloadCode() {
  const text = document.getElementById("codeBox").value;
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "mvdr_beamformer.m";
  a.click();
}

/* =========================================================
   MVDR VISUALIZATION (ARRAY FACTOR)
========================================================= */
let mvdrChart = null;

function submitAndRun() {

  const N = Number(document.getElementById("N").value);
  const theta_s = Number(document.getElementById("theta_s").value) * Math.PI/180;

  const angles = [];
  const response = [];

  for (let phi = -89; phi <= 90; phi++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const phase = -Math.PI*n*(Math.sin(phi*Math.PI/180)-Math.sin(theta_s));
      re += Math.cos(phase);
      im += Math.sin(phase);
    }
    const mag = re*re + im*im;
    response.push(mag);
    angles.push(phi);
  }

  const maxVal = Math.max(...response);
  const GdB = response.map(v => 10*Math.log10(v/maxVal));

  if (mvdrChart) mvdrChart.destroy();

  mvdrChart = new Chart(document.getElementById("mvdrChart"), {
    type: "line",
    data: {
      labels: angles,
      datasets: [{
        label: "d = λ/2",
        data: GdB,
        borderWidth: 2,
        pointRadius: 0
      }]
    },
    options: {
       responsive: false, 
       maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "MVDR Beamformed Output (Visualization)"
        }
      },
      scales: {
        x: { title: { display: true, text: "Angle (°)" } },
        y: { title: { display: true, text: "Magnitude (dB)" },min:-80 ,max: 5}
        
        
      }
    }
   

  });
}
