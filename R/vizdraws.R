#' Visualize Draws from Prior or Posterior Distributions
#'
#' A function to visualize draws from either the prior or posterior distribution, facilitating interpretation and decision-making.
#'
#' @title vizdraws
#'
#' @param prior (optional) Prior distribution or draws from it. Supported distributions: `Normal`, `uniform`, `beta`, and `gamma`. Provide either this or the posterior.
#' @param posterior (optional) Draws from the posterior distribution. Provide either this or the prior.
#' @param MME Minimum meaningful effect. If not provided, MME is set to zero.
#' @param threshold If the probability is greater than this threshold, a decision is considered comfortable.
#' @param units Optional argument to specify the units of x (e.g., dollars or applications).
#' @param colors Colors for the left, middle, and right areas. Defaults to c("#e41a1c", "#377eb8", "#4daf4a").
#' @param width Width for shiny.
#' @param height Height for shiny.
#' @param quantity Defaults to \code{FALSE}. When set to true, the text will reflect predicting a quantity rather than a treatment effect.
#' @param backgroundColor Defaults to \code{'#FFFFFF'}.
#' @param backgroundOpacity Defaults to \code{0.9}.
#' @param tense Either "future" or "past." This is the tense used in the description if quantity is set to TRUE. \code{NULL}.
#' @param xlab Defaults to \code{NULL}.
#' @param breaks Defaults to \code{NULL}.
#' @param break_names Defaults to \code{NULL}.
#' @param xlim Defaults to \code{NULL}.
#' @param font_scale Defaults to \code{1}.
#' @param display_mode_name Defaults to \code{FALSE}.
#' @param title Defaults to \code{''}.
#' @param stop_trans Defaults to \code{FALSE}. When set to true, the initial transition stops at posterior density.
#' @param percentage Defaults to \code{FALSE}. When set to true, the x-axis tick format will be set to percentage.
#' @param elementId Use an explicit element ID for the widget (rather than an automatically generated one). elementID for shiny.
#' @param logoPath Logo path. Defaults to \code{NULL}.
#' @param logoSize Logo size. Defaults to \code{FALSE}.
#' @param logoLocation Logo location. \code{c('bottom-right', 'top-left', 'top-right', 'bottom-left')}.
#'
#' @return A HTML widget object.
#' @export
#'
#' @examples
#' if(interactive()){
#'   set.seed(9782)
#'   library(vizdraws)
#'   vizdraws(prior = rnorm(100000))
#' }


vizdraws <-
  function(prior = NULL,
           posterior = NULL,
           MME = 0,
           threshold = NULL,
           units = NULL,
           quantity = FALSE,
           tense = c("future", "past"),
           backgroundColor = "#FFFFFF",
           backgroundOpacity = 0.9,
           xlab = NULL,
           breaks = NULL,
           break_names = NULL,
           colors = NULL,
           width = NULL,
           height = NULL,
           xlim = NULL,
           font_scale = 1,
           display_mode_name = FALSE,
           title = '',
           stop_trans = FALSE,
           percentage = FALSE,
           elementId = NULL,
           logoPath = NULL,
           logoSize = 100,
           logoLocation = c('bottom-right', 'top-left', 'top-right', 'bottom-left')) {
    logoLocation <- match.arg(logoLocation)
    if (MME < 0)
      stop("MME should be greater than 0")
    if (!is.null(breaks) &
        MME != 0)
      stop('MME and breaks cannot both be specified')
    if (length(breaks) > 10)
      stop('Can\'t specicfy more than 10 breaks')
    if (!is.null(breaks) &
        is.null(break_names))
      warning('Please supply break_names if specifying option breaks')
    if (!is.null(breaks) &
        !is.null(break_names) &
        length(break_names) <= length(breaks))
      stop('Not enough break_names specified')
    if (!is.null(breaks) &
        !is.null(colors) &
        length(colors) <= length(breaks))
      stop('Not enough colors specified')

    tense <- match.arg(tense)
    if (tense == "future") {
      tense <- "will be"
    }else{
      tense <- "was"
    }

    prior <- parse_prior(prior)

    if (!is.null(xlim)) {
      xlim <- sort(xlim)
      if (length(xlim) != 2)
        stop ('xlim must have exactly 2 elements')
    }

    #Need breaks to be in order
    if (!is.null(breaks) & sum(breaks != sort(breaks)) > 0) {
      breaks <- sort(breaks)
      if (!is.null(colors) |
          !is.null(break_names))
        warning(
          'breaks given out of order. Assuming colors/names supplied in ascending order, NOT in same order as breaks'
        )
    }

    if (is.null(threshold)) {
      allow_threshold <- FALSE
    } else if ((threshold <= 0 | threshold >= 1)) {
      stop("threshold should be between 0 and 1")
    } else {
      allow_threshold <- TRUE
    }

    if (is.null(prior) &
        is.null(posterior))
      stop("must specify at least one of prior or posterior")
    if (is.null(prior) | is.null(posterior))
      allow_mode_trans <- FALSE
    else
      allow_mode_trans <- TRUE

    # Calculate the breaks
    if (is.null(breaks)) {
      breaks <- if (MME != 0) {
        c(-MME, MME)
      } else
        0
    }

    if (!is.null(units))
      unit_text <- paste0(' ', units)
    else
      unit_text <- ''

    #Default names and colors
    defaults <-
      list(
        break_names = c(
          'Much much worse',
          'Much worse',
          'Worse',
          'A bit worse',
          'A little bit worse',
          'Equivalent',
          'A little bit better',
          'A bit better',
          'Better',
          'Much Better',
          'Much much better'
        ),
        colors = c(
          '#a50f15',
          '#de2d26',
          '#e41a1c',
          '#fcae91',
          '#fee5d9',
          '#377eb8',
          '#edf8e9',
          '#bae4b3',
          '#4daf4a',
          '#31a354',
          '#006d2c'
        )
      )

    group_options <- list(break_names = break_names,
                          colors = colors)

    for (x in c('colors', 'break_names')) {
      n_per_side <- ceiling(length(breaks) / 2)
      no_middle <- length(breaks) %% 2
      def <- defaults[[x]]
      if (is.null(group_options[[x]])) {
        if (n_per_side == 1)
          group_options[[x]] <- c(def[3], def[6], def[9])
        else if (n_per_side == 2)
          group_options[[x]] <-
            c(def[2], def[4], def[6], def[8], def[10])
        else if (n_per_side == 3)
          group_options[[x]] <-
            c(def[1], def[3], def[5], def[6], def[7], def[9], def[11])
        else if (n_per_side == 4)
          group_options[[x]] <-
            c(def[1], def[2], def[4], def[5], def[6], def[7], def[8], def[10], def[11])
        else if (n_per_side == 5)
          group_options[[x]] <- def

        if (no_middle)
          group_options[[x]] <-
            group_options[[x]][-(n_per_side + 1)]
      }
    }

    #Start graph showing prior, unless it's not provided
    start <- ifelse(is.null(prior), 'posterior', 'prior')

    #If only one was provided, duplicate it for the other
    #That way we can be sure they'll have the same range etc
    data = list(prior = prior, posterior = posterior)
    if (is.null(prior))
      data$prior = posterior
    if (is.null(posterior))
      data$posterior = prior

    n_dens <- 2 ^ 11
    # Figure out range of densities
    rng <- lapply(data, function(d) {
      data.frame(stats::density(d, n = n_dens, adjust = 1)[c("x", "y")]) %>%
        dplyr::summarize(xmin = min(x),
                         xmax = max(x))
    })
    xmin <- min(rng$prior, rng$posterior)
    xmax <- max(rng$prior, rng$posterior)
    # Calculate density values for input data
    dens <- lapply(data, function(d) {
      data.frame(stats::density(
        d,
        n = n_dens,
        adjust = 1,
        from = xmin,
        to = xmax
      )[c("x", "y")])
    })

    # forward options using x
    opts = list(
      dens = dataframeToD3(
        data.frame(
          x = dens$prior$x,
          y_prior = dens$prior$y,
          y_posterior = dens$posterior$y
        )
      ),
      prior = dataframeToD3(data.frame(x = data$prior)),
      posterior = dataframeToD3(data.frame(x = data$posterior)),
      breaks = breaks,
      break_names = group_options$break_names,
      colors = group_options$colors,
      allow_threshold = allow_threshold,
      threshold = threshold,
      unit_text = unit_text,
      is_quantity = quantity,
      xlab = xlab,
      start_mode = start,
      start_status = 'distribution',
      initial_trans = TRUE,
      stop_trans = stop_trans,
      percentage = percentage,
      allow_mode_trans = allow_mode_trans,
      xlim = xlim,
      font_scale = font_scale,
      display_mode_name = display_mode_name,
      title = title,
      tense = tense,
      backgroundColor = backgroundColor,
      backgroundOpacity = backgroundOpacity,
      logoPath = logoPath,
      logoSize = logoSize,
      logoLocation = logoLocation

    )

    # Define sizing policy
    sizingPolicy = htmlwidgets::sizingPolicy(
      defaultWidth = 400,
      defaultHeight = 400,
      browser.fill = TRUE
    )
    # create widget
    htmlwidgets::createWidget(
      name = 'vizdraws',
      opts,
      width = width,
      height = height,
      package = 'vizdraws',
      elementId = elementId,
      sizingPolicy = sizingPolicy
    )
  }

#' Shiny bindings for vizdraws
#'
#' Output and render functions for using vizdraws within Shiny
#' applications and interactive Rmd documents.
#'
#' @param outputId output variable to read from
#' @param width,height Must be a valid CSS unit (like \code{'100\%'},
#'   \code{'400px'}, \code{'auto'}) or a number, which will be coerced to a
#'   string and have \code{'px'} appended.
#' @param expr An expression that generates a vizdraws
#' @param env The environment in which to evaluate \code{expr}.
#' @param quoted Is \code{expr} a quoted expression (with \code{quote()})? This
#'   is useful if you want to save an expression in a variable.
#'
#' @name vizdraws-shiny
#'
#' @export
vizdrawsOutput <-
  function(outputId,
           width = '100%',
           height = '100%') {
    htmlwidgets::shinyWidgetOutput(outputId, 'vizdraws', width, height, package = 'vizdraws')
  }

#' @rdname vizdraws-shiny
#' @export
rendervizdraws <-
  function(expr,
           env = parent.frame(),
           quoted = FALSE) {
    if (!quoted) {
      expr <- substitute(expr)
    } # force quoted
    htmlwidgets::shinyRenderWidget(expr, vizdrawsOutput, env, quoted = TRUE)
  }
